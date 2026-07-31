'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../lib/api';
import type { GraphData, Diary } from '../../lib/types';

/* ─── Entity type config ─── */

const ENTITY_COLORS: Record<string, { color: string; emoji: string }> = {
  person: { color: '#60a5fa', emoji: '🧑' },
  event: { color: '#f97316', emoji: '📅' },
  place: { color: '#34d399', emoji: '📍' },
  emotion: { color: '#f472b6', emoji: '💖' },
  topic: { color: '#a78bfa', emoji: '🏷️' },
};
const FALLBACK_COLOR = '#94a3b8';

/* ─── Shared types ─── */

interface LayoutNode {
  id: number;
  type: string;
  name: string;
  diaryCount: number;
  x: number;
  y: number;
}

interface LayoutEdge {
  source: number;
  target: number;
  relation: string;
  weight: number;
}

/* ─── Knowledge Graph ─── */

interface KGProps {
  /** Override data for controlled usage (e.g. storybook / testing) */
  data?: GraphData | null;
}

export default function KnowledgeGraph({ data: externalData }: KGProps) {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState('');
  const [selectedNode, setSelectedNode] = useState<number | null>(null);
  const [relatedDiaries, setRelatedDiaries] = useState<Diary[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);
  const [dragState, setDragState] = useState<{ id: number; x: number; y: number } | null>(null);
  const [nodes, setNodes] = useState<LayoutNode[]>([]);
  const [edges, setEdges] = useState<LayoutEdge[]>([]);

  /* ── Load data ── */
  const loadGraph = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const graphData = await api.ragGraph();
      setData(graphData as unknown as GraphData);
      layoutGraph(graphData as unknown as GraphData);
    } catch {
      setError('知识图谱暂时不可用');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── dagre-like layout (simplified manual layout for no-dagre) ── */
  const layoutGraph = useCallback((graphData: GraphData) => {
    if (!graphData?.nodes?.length) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const { width, height } = dimensions;
    const padding = 60;
    const availableW = width - padding * 2;
    const availableH = height - padding * 2;

    // Group nodes by type for layering
    const groups: Record<string, typeof graphData.nodes> = {};
    for (const n of graphData.nodes) {
      if (!groups[n.type]) groups[n.type] = [];
      groups[n.type].push(n);
    }

    const types = Object.keys(groups);
    const layerH = types.length > 1 ? availableH / types.length : availableH / 2;
    const laidOut: LayoutNode[] = [];

    types.forEach((type, typeIdx) => {
      const items = groups[type];
      const cy = padding + layerH * typeIdx + layerH / 2;
      const spacingX = items.length > 1 ? availableW / (items.length - 1) : 0;
      const startX = items.length > 1 ? padding : width / 2;

      items.forEach((n, i) => {
        laidOut.push({
          id: n.id,
          type: n.type,
          name: n.name,
          diaryCount: n.diaryCount,
          x: startX + spacingX * i,
          y: cy + (i % 2 === 0 ? -10 : 10),
        });
      });
    });

    setNodes(laidOut);
    setEdges(
      (graphData.edges || []).map((e) => ({
        source: typeof e.source === 'number' ? e.source : (e.source as any).id,
        target: typeof e.target === 'number' ? e.target : (e.target as any).id,
        relation: e.relation,
        weight: e.weight,
      }))
    );
  }, [dimensions]);

  /* ── Init ── */
  useEffect(() => {
    if (!externalData) {
      loadGraph();
    } else {
      setData(externalData);
      layoutGraph(externalData);
    }
  }, [externalData, loadGraph, layoutGraph]);

  /* ── Resize ── */
  useEffect(() => {
    const el = svgRef.current?.parentElement;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width: Math.max(width, 300), height: Math.max(height * 0.7, 300) });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ── Relayout when dimensions change ── */
  useEffect(() => {
    if (data) layoutGraph(data);
  }, [dimensions]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Extract entities ── */
  const handleExtract = useCallback(async () => {
    setExtracting(true);
    try {
      const result = await api.ragExtractEntities({});
      // reload graph after extraction
      const graphData = await api.ragGraph();
      setData(graphData as unknown as GraphData);
      layoutGraph(graphData as unknown as GraphData);
    } catch {
      setError('实体提取失败，请重试');
    } finally {
      setExtracting(false);
    }
  }, [layoutGraph]);

  /* ── Select node → load related diaries ── */
  const handleNodeClick = useCallback(async (nodeId: number) => {
    if (selectedNode === nodeId) {
      setSelectedNode(null);
      setRelatedDiaries([]);
      return;
    }
    setSelectedNode(nodeId);
    setRelatedLoading(true);
    try {
      const detail = await api.ragEntityDetail(nodeId);
      if (detail) {
        setRelatedDiaries(detail.diaries || []);
      }
    } catch {
      setRelatedDiaries([]);
    } finally {
      setRelatedLoading(false);
    }
  }, [selectedNode]);

  /* ── Node helpers ── */
  const getNodeRadius = useCallback((diaryCount: number) => Math.max(24, Math.min(45, 24 + diaryCount * 3)), []);
  const getEntityColor = (type: string) => ENTITY_COLORS[type]?.color || FALLBACK_COLOR;
  const getEntityEmoji = (type: string) => ENTITY_COLORS[type]?.emoji || '•';

  const selectedNodeObj = selectedNode ? nodes.find((n) => n.id === selectedNode) : null;
  const edgeNodeIds = new Set(
    selectedNode
      ? edges.flatMap((e) =>
          e.source === selectedNode || e.target === selectedNode ? [e.source, e.target] : []
        )
      : []
  );

  /* ── Render ── */
  return (
    <div>
      {/* Loading state */}
      {loading && (
        <div
          className="rounded-xl p-8 text-center"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}
        >
          <div className="text-3xl mb-3">🗺</div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>正在加载知识图谱...</p>
          <div className="flex justify-center mt-3">
            <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && !nodes.length && (
        <div
          className="rounded-xl p-8 text-center"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}
        >
          <div className="text-3xl mb-3">🗺</div>
          <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>还没有图谱数据</p>
          <p className="text-xs mb-4" style={{ color: 'var(--text-tertiary)' }}>
            知识图谱从你的日记中提取实体（人物、事件、地点、情绪、话题），生成关联关系。
          </p>
          <button
            onClick={handleExtract}
            disabled={extracting}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
            style={{ background: 'var(--accent)', color: 'var(--accent-text)' }}
          >
            {extracting ? '⏳ 提取中...' : '✨ 从日记中提取实体'}
          </button>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div
          className="rounded-xl p-6 text-center"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}
        >
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{error}</p>
          <button onClick={loadGraph} className="mt-2 px-3 py-1 rounded-lg text-xs" style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>
            重试
          </button>
        </div>
      )}

      {/* Graph canvas */}
      {!loading && nodes.length > 0 && (
        <div className="relative" style={{ width: '100%', minHeight: 300 }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
            className="w-full rounded-xl"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-default)',
              cursor: 'grab',
              minHeight: 300,
            }}
            onDoubleClick={() => {
              setSelectedNode(null);
              setRelatedDiaries([]);
            }}
          >
            {/* Edges */}
            {edges.map((edge, i) => {
              const src = nodes.find((n) => n.id === edge.source);
              const tgt = nodes.find((n) => n.id === edge.target);
              if (!src || !tgt) return null;
              const isActive =
                selectedNode === null ||
                selectedNode === edge.source ||
                selectedNode === edge.target;
              const isSelected = selectedNode !== null && (selectedNode === edge.source || selectedNode === edge.target);
              return (
                <g key={`edge-${i}`} opacity={isActive ? 1 : 0.15}>
                  <line x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y} stroke="var(--border-default)" strokeWidth={Math.max(1, Math.min(3, edge.weight * 3))} />
                  {/* Relation label at midpoint */}
                  <text
                    x={(src.x + tgt.x) / 2}
                    y={(src.y + tgt.y) / 2 - 6}
                    textAnchor="middle"
                    fill="var(--text-tertiary)"
                    fontSize="9"
                  >
                    {edge.relation}
                  </text>
                </g>
              );
            })}

            {/* Nodes */}
            {nodes.map((node) => {
              const r = getNodeRadius(node.diaryCount);
              const color = getEntityColor(node.type);
              const isSelectedNode = selectedNode === node.id;
              const isRelated = selectedNode === null || selectedNode === node.id || edgeNodeIds.has(node.id);
              const scale = hoveredNode === node.id ? 1.15 : isSelectedNode ? 1.1 : 1;
              const opacity = isRelated ? 1 : 0.2;

              return (
                <g
                  key={`node-${node.id}`}
                  transform={`translate(${node.x}, ${node.y}) scale(${scale})`}
                  opacity={opacity}
                  style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={() => handleNodeClick(node.id)}
                >
                  {/* Shadow */}
                  <circle cx="0" cy="0" r={r} fill="none" stroke="var(--border-default)" strokeWidth="0" filter="url(#shadow)" />
                  {/* Main circle */}
                  <circle cx="0" cy="0" r={r} fill={color + '25'} stroke={color} strokeWidth={isSelectedNode ? 3 : 2} />
                  {/* Emoji */}
                  <text x="0" y="-4" textAnchor="middle" fontSize="14" fill={color}>{getEntityEmoji(node.type)}</text>
                  {/* Label */}
                  <text x="0" y={r + 14} textAnchor="middle" fontSize="11" fill="var(--text-primary)" style={{ maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {node.name.length > 6 ? node.name.slice(0, 6) + '…' : node.name}
                  </text>
                  {/* Diary count */}
                  <text x="0" y={r + 26} textAnchor="middle" fontSize="9" fill="var(--text-tertiary)">{node.diaryCount}篇</text>
                </g>
              );
            })}

            {/* Shadow filter */}
            <defs>
              <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
              </filter>
            </defs>
          </svg>

          {/* Related diaries panel */}
          {selectedNodeObj && (
            <div
              className="mt-4 rounded-xl p-4"
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span>{getEntityEmoji(selectedNodeObj.type)}</span>
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {selectedNodeObj.name}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    — 出现在 {selectedNodeObj.diaryCount} 篇日记中
                  </span>
                </div>
                <button
                  onClick={() => { setSelectedNode(null); setRelatedDiaries([]); }}
                  className="p-1 rounded transition-colors"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                </button>
              </div>

              {relatedLoading && (
                <div className="flex items-center gap-2 py-2">
                  <div className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>加载中...</span>
                </div>
              )}

              {!relatedLoading && relatedDiaries.length === 0 && (
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>暂无关联日记</p>
              )}

              {!relatedLoading && relatedDiaries.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {relatedDiaries.slice(0, 10).map((d) => (
                    <div key={d.id} className="flex items-center justify-between py-1 border-b last:border-b-0" style={{ borderColor: 'var(--border-default)' }}>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          {d.date?.slice(0, 10)}
                        </span>
                        <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                          {d.content?.slice(0, 60)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {selectedNodeObj.diaryCount > 10 && (
                    <p className="text-xs text-center pt-1" style={{ color: 'var(--text-tertiary)' }}>
                      还有 {selectedNodeObj.diaryCount - 10} 篇
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
