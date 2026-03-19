"use client";

import React, { useState, useEffect } from 'react';
import styles from '@/styles/theme.module.css';
import { diffWords } from 'diff';
import { consumeSSEStream } from '@/lib/sse-client';

interface Lane {
  id: string;
  model: string;
  content: string;
  isGenerating: boolean;
  metrics: {
    ttft: number;
    latency: number;
    cost: number;
  };
  controller: AbortController | null;
}

export default function ArenaPage() {
  const [models, setModels] = useState<{ provider: string; id: string }[]>([]);
  const [lanes, setLanes] = useState<Lane[]>([
    { id: '1', model: '', content: '', isGenerating: false, metrics: { ttft: 0, latency: 0, cost: 0 }, controller: null },
    { id: '2', model: '', content: '', isGenerating: false, metrics: { ttft: 0, latency: 0, cost: 0 }, controller: null }
  ]);
  const [input, setInput] = useState('');
  const [isDiffMode, setIsDiffMode] = useState(false);
  const [diffPair, setDiffPair] = useState<[number, number]>([0, 1]);
  const [vote, setVote] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/models')
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d) && d.length > 0) {
          setModels(d);
          setLanes([
            { id: '1', model: d[0].id, content: '', isGenerating: false, metrics: { ttft: 0, latency: 0, cost: 0 }, controller: null },
            { id: '2', model: d[Math.min(1, d.length - 1)].id, content: '', isGenerating: false, metrics: { ttft: 0, latency: 0, cost: 0 }, controller: null }
          ]);
        }
      })
      .catch(() => {});
  }, []);

  const addLane = () => {
    if (lanes.length >= 3 || models.length === 0) return;
    const nextModel = models[Math.min(lanes.length, models.length - 1)].id;
    setLanes(prev => [
      ...prev,
      { id: String(prev.length + 1), model: nextModel, content: '', isGenerating: false, metrics: { ttft: 0, latency: 0, cost: 0 }, controller: null }
    ]);
  };

  const removeLane = (id: string) => {
    if (lanes.length <= 2) return;
    setLanes(prev => prev.filter(l => l.id !== id));
  };

  const handleSend = () => {
    if (!input.trim()) return;
    setVote(null);
    setIsDiffMode(false);

    lanes.forEach(lane => {
      if (lane.controller) lane.controller.abort();
      const controller = new AbortController();
      updateLane(lane.id, { content: '', isGenerating: true, metrics: { ttft: 0, latency: 0, cost: 0 }, controller });
      runLane(lane.id, lane.model, input, controller);
    });
  };

  const runLane = async (laneId: string, modelId: string, prompt: string, controller: AbortController) => {
    const startTime = Date.now();
    let firstTokenTime = 0;
    let text = '';
    let laneCost = 0;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelId,
          messages: [{ role: 'user', content: prompt }]
        }),
        signal: controller.signal
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }

      await consumeSSEStream(res, {
        onDelta: (chunk) => {
          if (!firstTokenTime) {
            firstTokenTime = Date.now();
            updateLaneMetrics(laneId, { ttft: firstTokenTime - startTime });
          }
          text += chunk;
          updateLaneContent(laneId, text);
        },
        onUsage: (usageData) => {
          if (usageData.price) {
            laneCost = usageData.price;
          }
        },
        onError: (err) => {
          text += `\n\n[Erreur: ${err.message}]`;
          updateLaneContent(laneId, text);
        }
      });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        updateLaneContent(laneId, `[Erreur: ${err.message}]`);
      }
    } finally {
      const endTime = Date.now();
      updateLane(laneId, { isGenerating: false, controller: null });
      updateLaneMetrics(laneId, { latency: endTime - startTime, cost: laneCost });
    }
  };

  const updateLane = (id: string, updates: Partial<Lane>) => {
    setLanes(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const updateLaneContent = (id: string, content: string) => {
    setLanes(prev => prev.map(l => l.id === id ? { ...l, content } : l));
  };

  const updateLaneMetrics = (id: string, metrics: Partial<Lane['metrics']>) => {
    setLanes(prev => prev.map(l => l.id === id ? { ...l, metrics: { ...l.metrics, ...metrics } } : l));
  };

  const handleStopAll = () => {
    lanes.forEach(l => {
      if (l.controller) l.controller.abort();
    });
  };

  const handleVote = (id: string) => {
    setVote(id);
    try {
      localStorage.setItem(`arena_vote_${Date.now()}`, id);
    } catch {}
  };

  const isGenerating = lanes.some(l => l.isGenerating);

  const renderDiff = () => {
    const laneA = lanes[diffPair[0]];
    const laneB = lanes[diffPair[1]];
    if (!laneA || !laneB) return null;

    const diff = diffWords(laneA.content, laneB.content);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', fontSize: '0.85rem', color: 'var(--muted)' }}>
          <span>Comparaison : <strong>{laneA.model}</strong> vs <strong>{laneB.model}</strong></span>
        </div>
        <div style={{ flex: 1, padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '4px', whiteSpace: 'pre-wrap', lineHeight: 1.6, overflowY: 'auto', background: 'var(--bg-color)' }}>
          {diff.map((part, i) => {
            let textDecoration = 'none';
            let bg = 'transparent';
            let fontWeight = 400;

            if (part.added) {
              bg = '#eaeaea';
              fontWeight = 600;
            } else if (part.removed) {
              bg = '#f2f2f2';
              textDecoration = 'line-through';
            }

            return (
              <span key={i} style={{ backgroundColor: bg, textDecoration, fontWeight }}>
                {part.value}
              </span>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container} style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem', width: '100%', maxWidth: '1040px', margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
        <textarea
          className={styles.input}
          style={{ resize: 'none', overflow: 'hidden', minHeight: '44px' }}
          rows={1}
          value={input}
          onChange={e => {
            setInput(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Invite comparative pour tous les modèles..."
        />
        {isGenerating ? (
          <button className={styles.button} style={{ height: '44px', minWidth: '90px' }} onClick={handleStopAll}>Arrêter</button>
        ) : (
          <button className={styles.buttonPrimary} style={{ height: '44px', minWidth: '90px' }} onClick={handleSend}>Lancer</button>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className={styles.button} onClick={() => setIsDiffMode(!isDiffMode)}>
            {isDiffMode ? 'Vue Colonnes' : 'Diff Mot à Mot'}
          </button>
          {lanes.length < 3 && !isDiffMode && (
            <button className={styles.button} onClick={addLane}>+ Ajouter Voie</button>
          )}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
          {lanes.length} modèles en compétition
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, gap: '1rem', overflow: 'hidden' }}>
        {isDiffMode ? (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {renderDiff()}
          </div>
        ) : (
          lanes.map((lane, idx) => (
            <div key={lane.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '4px', overflowY: 'auto', background: 'var(--bg-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'center' }}>
                <select
                  className={styles.input}
                  style={{ flex: 1 }}
                  value={lane.model}
                  onChange={e => updateLane(lane.id, { model: e.target.value })}
                >
                  {models.map(m => (
                    <option key={m.id} value={m.id}>{m.provider} — {m.id}</option>
                  ))}
                </select>
                {lanes.length > 2 && (
                  <button className={styles.button} style={{ padding: '0.4rem 0.6rem' }} onClick={() => removeLane(lane.id)}>×</button>
                )}
              </div>

              <div style={{ flex: 1, whiteSpace: 'pre-wrap', fontSize: '0.9rem', lineHeight: 1.5, overflowY: 'auto' }}>
                {lane.content || <span style={{ color: 'var(--muted)' }}>En attente de l'invite...</span>}
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '0.2rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.6rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>TTFT: {lane.metrics.ttft} ms</span>
                  <span>Durée: {lane.metrics.latency} ms</span>
                </div>
                <div>Coût est.: ${lane.metrics.cost.toFixed(5)}</div>
              </div>

              {!isGenerating && lane.content && (
                <button
                  className={vote === lane.id ? styles.buttonPrimary : styles.button}
                  onClick={() => handleVote(lane.id)}
                >
                  {vote === lane.id ? 'Préféré ✓' : 'Voter'}
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
