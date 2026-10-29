import { RawFigmaNode } from './types.js';

export interface ParsedFigmaUrl {
  fileKey: string;
  nodeId?: string;
}

export function parseFigmaUrl(urlStr: string): ParsedFigmaUrl {
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    throw new Error(`Invalid Figma URL: "${urlStr}"`);
  }

  const hostname = parsed.hostname.toLowerCase();
  if (hostname !== 'figma.com' && hostname !== 'www.figma.com') {
    throw new Error(`Invalid Figma URL host: ${parsed.hostname}. Expected figma.com or www.figma.com`);
  }

  const segments = parsed.pathname.split('/').filter(Boolean);
  let fileKey = '';

  if (segments.length >= 2 && ['design', 'file', 'proto', 'board'].includes(segments[0])) {
    fileKey = segments[1];
  } else if (segments.length >= 1 && !['design', 'file', 'proto', 'board'].includes(segments[0])) {
    fileKey = segments[0];
  }

  if (!fileKey) {
    throw new Error(`Missing fileKey in Figma URL: "${urlStr}"`);
  }

  const rawNodeId = parsed.searchParams.get('node-id') || parsed.searchParams.get('node_id');
  let nodeId: string | undefined;
  if (rawNodeId) {
    nodeId = rawNodeId.replace(/-/g, ':');
  }

  return {
    fileKey,
    ...(nodeId ? { nodeId } : {})
  };
}

export function extractFigmaNode(payload: any, preferredNodeId?: string): RawFigmaNode {
  if (payload?.nodes && typeof payload.nodes === 'object') {
    if (preferredNodeId) {
      if (payload.nodes[preferredNodeId]?.document) {
        return payload.nodes[preferredNodeId].document as RawFigmaNode;
      }
      const altId = preferredNodeId.includes(':')
        ? preferredNodeId.replace(/:/g, '-')
        : preferredNodeId.replace(/-/g, ':');
      if (payload.nodes[altId]?.document) {
        return payload.nodes[altId].document as RawFigmaNode;
      }
    }

    for (const entry of Object.values(payload.nodes)) {
      if ((entry as any)?.document) {
        return (entry as any).document as RawFigmaNode;
      }
    }
  }

  if (payload?.document) {
    return payload.document as RawFigmaNode;
  }

  if (payload && typeof payload === 'object' && payload.type) {
    return payload as RawFigmaNode;
  }

  throw new Error('Invalid Figma payload: missing document or node tree');
}

export async function fetchFigmaNodeFromUrl(
  figmaUrl: string,
  options?: { token?: string; fetchImpl?: typeof fetch; timeoutMs?: number }
): Promise<RawFigmaNode> {
  const token = options?.token || process.env.FIGMA_ACCESS_TOKEN;
  if (!token) {
    throw new Error('Missing Figma access token. Pass --token or set FIGMA_ACCESS_TOKEN.');
  }

  const { fileKey, nodeId } = parseFigmaUrl(figmaUrl);
  const endpoint = nodeId
    ? `https://api.figma.com/v1/files/${encodeURIComponent(fileKey)}/nodes?ids=${encodeURIComponent(nodeId)}`
    : `https://api.figma.com/v1/files/${encodeURIComponent(fileKey)}?depth=4`;

  const fetcher = options?.fetchImpl ?? fetch;
  const timeoutMs = options?.timeoutMs ?? 15000;
  const signal = typeof AbortSignal?.timeout === 'function' ? AbortSignal.timeout(timeoutMs) : undefined;

  let res: Response;
  try {
    res = await fetcher(endpoint, {
      headers: {
        'X-Figma-Token': token
      },
      signal
    });
  } catch (err: any) {
    const msg = (err?.message || 'Network error').split(token).join('[REDACTED]');
    throw new Error(`Figma API network error: ${msg}`);
  }

  if (!res.ok) {
    throw new Error(`Figma API error (${res.status}): ${res.statusText}`);
  }

  const data = await res.json();
  return extractFigmaNode(data, nodeId);
}
