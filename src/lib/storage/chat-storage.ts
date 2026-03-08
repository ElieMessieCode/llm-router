import { get, set, del } from 'idb-keyval';

export type Role = 'system' | 'user' | 'assistant';

export interface MessageNode {
  id: string;
  parentId: string | null;
  role: Role;
  content: string;
  provider?: string;
  model?: string;
  usage?: { prompt_tokens: number; completion_tokens: number };
  costUsd?: number;
  createdAt: number;
}

const STORAGE_KEY = 'chat_messages_tree';

export async function getMessageTree(): Promise<MessageNode[]> {
  const data = await get<MessageNode[]>(STORAGE_KEY);
  return data || [];
}

export async function saveMessageNode(node: MessageNode): Promise<void> {
  const tree = await getMessageTree();
  const index = tree.findIndex((n) => n.id === node.id);
  if (index >= 0) {
    tree[index] = node;
  } else {
    tree.push(node);
  }
  await set(STORAGE_KEY, tree);
}

export async function clearHistory(): Promise<void> {
  await del(STORAGE_KEY);
}

export async function exportHistoryJSON(): Promise<string> {
  const tree = await getMessageTree();
  return JSON.stringify(tree, null, 2);
}

export async function importHistoryJSON(json: string): Promise<void> {
  try {
    const data = JSON.parse(json);
    if (Array.isArray(data)) {
      await set(STORAGE_KEY, data);
    }
  } catch (e) {
    console.error(e);
  }
}

export function getBranch(tree: MessageNode[], leafId: string): MessageNode[] {
  const branch: MessageNode[] = [];
  const map = new Map(tree.map((n) => [n.id, n]));
  let currentId: string | null = leafId;

  while (currentId && map.has(currentId)) {
    const node: MessageNode = map.get(currentId)!;
    branch.unshift(node);
    currentId = node.parentId;
  }
  return branch;
}

export function getLeaves(tree: MessageNode[]): MessageNode[] {
  const parentIds = new Set(tree.map((n) => n.parentId).filter(Boolean));
  return tree.filter((n) => !parentIds.has(n.id));
}
