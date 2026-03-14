"use client";

import React, { useState, useEffect } from 'react';
import styles from '@/styles/theme.module.css';
import { getMessageTree, getBranch, getLeaves, saveMessageNode, clearHistory, MessageNode } from '@/lib/storage/chat-storage';
import { consumeSSEStream } from '@/lib/sse-client';

export default function ChatPage() {
  const [models, setModels] = useState<{ provider: string; id: string }[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [systemPrompt, setSystemPrompt] = useState<string>('');
  const [showSystem, setShowSystem] = useState<boolean>(false);
  const [input, setInput] = useState('');

  const [tree, setTree] = useState<MessageNode[]>([]);
  const [currentLeafId, setCurrentLeafId] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const [metrics, setMetrics] = useState({ ttft: 0, latency: 0, cost: 0 });

  useEffect(() => {
    fetch('/api/models')
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d) && d.length > 0) {
          setModels(d);
          setSelectedModel(d[0].id);
        }
      })
      .catch(() => {});

    getMessageTree().then(t => {
      setTree(t);
      const leaves = getLeaves(t);
      if (leaves.length > 0) {
        setCurrentLeafId(leaves[0].id);
      }
    });
  }, []);

  const currentBranch = currentLeafId ? getBranch(tree, currentLeafId) : [];

  const handleSend = async (text: string, overrideParentId?: string | null) => {
    if (!text.trim() || isGenerating) return;

    const parentId = overrideParentId !== undefined ? overrideParentId : currentLeafId;
    const userMsgId = crypto.randomUUID();
    const userNode: MessageNode = {
      id: userMsgId,
      parentId,
      role: 'user',
      content: text,
      createdAt: Date.now()
    };

    const newTree = [...tree, userNode];
    setTree(newTree);
    setCurrentLeafId(userMsgId);
    await saveMessageNode(userNode);
    setInput('');

    const branch = getBranch(newTree, userMsgId);

    setIsGenerating(true);
    const controller = new AbortController();
    setAbortController(controller);

    const startTime = Date.now();
    let firstTokenTime = 0;

    const asstMsgId = crypto.randomUUID();
    let asstContent = '';
    let currentCost = 0;

    const asstNode: MessageNode = {
      id: asstMsgId,
      parentId: userMsgId,
      role: 'assistant',
      content: '',
      model: selectedModel,
      createdAt: Date.now()
    };

    setTree(prev => [...prev, asstNode]);
    setCurrentLeafId(asstMsgId);

    try {
      const messagesPayload = branch.map(b => ({
        role: b.role,
        content: b.content
      }));

      if (systemPrompt.trim()) {
        messagesPayload.unshift({ role: 'system', content: systemPrompt.trim() });
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          messages: messagesPayload
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
            setMetrics(m => ({ ...m, ttft: firstTokenTime - startTime }));
          }
          asstContent += chunk;
          asstNode.content = asstContent;
          setTree(prev => prev.map(n => n.id === asstMsgId ? { ...asstNode, content: asstContent } : n));
        },
        onUsage: (usageData) => {
          if (usageData.price) {
            currentCost = usageData.price;
          }
        },
        onError: (err) => {
          asstContent += `\n\n[Erreur: ${err.message}]`;
          asstNode.content = asstContent;
          setTree(prev => prev.map(n => n.id === asstMsgId ? { ...asstNode, content: asstContent } : n));
        }
      });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        asstNode.content = `[Erreur: ${err.message}]`;
        setTree(prev => prev.map(n => n.id === asstMsgId ? { ...asstNode } : n));
      }
    } finally {
      const endTime = Date.now();
      asstNode.costUsd = currentCost;
      await saveMessageNode(asstNode);
      setIsGenerating(false);
      setAbortController(null);
      setMetrics(m => ({ ...m, latency: endTime - startTime, cost: m.cost + currentCost }));
    }
  };

  const handleStop = () => {
    if (abortController) {
      abortController.abort();
    }
  };

  const handleClear = async () => {
    await clearHistory();
    setTree([]);
    setCurrentLeafId(null);
    setMetrics({ ttft: 0, latency: 0, cost: 0 });
  };

  const handleRegenerate = () => {
    if (currentBranch.length >= 2) {
      const lastUser = currentBranch[currentBranch.length - 2];
      handleSend(lastUser.content, lastUser.parentId);
    }
  };

  const handleBranch = (nodeId: string) => {
    setCurrentLeafId(nodeId);
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tree, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `llm-history-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className={styles.container} style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem', maxWidth: '840px', margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center' }}>
        <select
          className={styles.input}
          style={{ width: '220px' }}
          value={selectedModel}
          onChange={e => setSelectedModel(e.target.value)}
        >
          {models.map(m => (
            <option key={m.id} value={m.id}>{m.provider} — {m.id}</option>
          ))}
        </select>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className={styles.button} onClick={() => setShowSystem(!showSystem)}>
            {showSystem ? 'Masquer Système' : 'Prompt Système'}
          </button>
          <button className={styles.button} onClick={handleExportJSON}>Export JSON</button>
          <button className={styles.button} onClick={handleClear}>Effacer</button>
        </div>
      </div>

      {showSystem && (
        <textarea
          className={styles.input}
          rows={2}
          value={systemPrompt}
          onChange={e => setSystemPrompt(e.target.value)}
          placeholder="Consignes système optionnelles..."
        />
      )}

      <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', background: 'var(--bg-color)' }}>
        {currentBranch.length === 0 && (
          <div style={{ margin: 'auto', color: 'var(--muted)', fontSize: '0.9rem' }}>Aucun message dans cette session. Saisissez une instruction pour démarrer.</div>
        )}
        {currentBranch.map((node, i) => (
          <div key={node.id} style={{ alignSelf: node.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{
              background: node.role === 'user' ? 'var(--text-color)' : 'var(--bg-color)',
              color: node.role === 'user' ? 'var(--bg-color)' : 'var(--text-color)',
              border: node.role === 'user' ? 'none' : '1px solid var(--border-color)',
              padding: '0.85rem 1rem',
              borderRadius: '4px',
              fontSize: '0.95rem',
              lineHeight: 1.5
            }}>
              <div style={{ whiteSpace: 'pre-wrap' }}>{node.content}</div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--muted)', alignSelf: node.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <button onClick={() => handleBranch(node.id)} style={{ textDecoration: 'underline' }}>Ramifier ici</button>
              {node.role === 'assistant' && i === currentBranch.length - 1 && !isGenerating && (
                <button onClick={handleRegenerate} style={{ textDecoration: 'underline' }}>Régénérer</button>
              )}
            </div>
          </div>
        ))}
      </div>

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
              handleSend(input);
            }
          }}
          placeholder="Saisissez un message..."
        />
        {isGenerating ? (
          <button className={styles.button} style={{ height: '44px', minWidth: '80px' }} onClick={handleStop}>Stop</button>
        ) : (
          <button className={styles.buttonPrimary} style={{ height: '44px', minWidth: '80px' }} onClick={() => handleSend(input)}>Envoyer</button>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--muted)', padding: '0 0.25rem' }}>
        <span>TTFT: {metrics.ttft} ms</span>
        <span>Durée: {metrics.latency} ms</span>
        <span>Coût session: ${metrics.cost.toFixed(5)}</span>
      </div>
    </div>
  );
}
