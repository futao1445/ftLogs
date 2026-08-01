'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { api } from '../../lib/api';
import type { GraphData, Diary } from '../../lib/types';

/* ─── 实体类型（全中文）─── */

const ENTITY_TYPES: Record<string, { label: string; color: string }> = {
  person:  { label: '人物', color: '#6fb4ff' },
  event:   { label: '事件', color: '#a8d0ff' },
  place:   { label: '地点', color: '#e2ecfa' },
  emotion: { label: '情绪', color: '#8fa6c4' },
  topic:   { label: '话题', color: '#4a6a94' },
};
const FALLBACK_COLOR = '#8fa6c4';
const GOLD = '#ffd9a0';

/* ─── 共享类型 ─── */

interface GraphNode {
  id: number;
  type: string;
  typeCn?: string;
  name: string;
  diaryCount: number;
}
interface GraphEdge {
  source: number;
  target: number;
  weight: number;
  relation?: string;
}
interface GraphRelation {
  sourceId: number;
  targetId: number;
  weight?: number;
  relation?: string;
}

/* 鱼游荡深度（人物/事件偏上，地点/话题/情绪下沉）*/
const LAYER: Record<string, number> = {
  person: 0, event: 0.25, topic: 0.5, emotion: 0.65, place: 0.85,
};
function fishSize(count: number) {
  return Math.min(1.15, 0.75 + count * 0.07); // 鱼大小 ∝ 关联日记数
}

/* 几何玻璃鱼（禁手绘生物 — 纯几何）*/
function FishIcon({ size }: { size: number }) {
  return (
    <svg
      width={44 * size}
      height={30 * size}
      viewBox="0 0 44 30"
      fill="none"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <path className="tail" d="M6 15 L-4 7 L-4 23 Z" fill="currentColor" opacity="0.55" stroke="rgba(168,208,255,0.35)" strokeWidth="0.8" />
      <ellipse cx="26" cy="15" rx="17" ry="9.5" fill="currentColor" opacity="0.16" />
      <ellipse cx="26" cy="15" rx="17" ry="9.5" stroke="currentColor" strokeWidth="1.1" opacity="0.85" />
      <path d="M12 15 Q 24 7 38 13" stroke="rgba(255,255,255,0.5)" strokeWidth="0.7" fill="none" />
      <path d="M14 18 Q 26 12 37 17" stroke="rgba(255,255,255,0.25)" strokeWidth="0.6" fill="none" />
      <circle cx="38" cy="12" r="1.7" fill="rgba(226,236,250,0.95)" />
      <circle cx="38" cy="12" r="4" fill="rgba(255,255,255,0.12)" />
      <circle cx="38" cy="12" r="1" fill="rgba(226,236,250,0.9)" />
    </svg>
  );
}

/* ─── 池塘鱼游荡画布 ─── */

interface FishState {
  x: number; y: number;
  heading: number; speed: number; turn: number;
  vx: number; vy: number;
  pull: { tx: number; ty: number; t: number } | null;
  orbit: { ax: number; ay: number; radius: number; angle: number } | null; // 环形驻留：围绕选中鱼不挤
  isSelected: boolean;
  isRelated: boolean;
}

interface FishPondProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedId: number | null;
  relatedNodes: GraphNode[];
  relations: GraphRelation[];
  onSelect: (id: number) => void;
}

function FishPond({ nodes, edges, selectedId, relatedNodes, relations, onSelect }: FishPondProps) {
  const pondRef = useRef<HTMLDivElement>(null);
  const fishRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const nameRefs = useRef<Map<number, HTMLSpanElement>>(new Map());
  const stateRef = useRef<Map<number, FishState>>(new Map());
  const linkPathsRef = useRef<Map<string, SVGPathElement>>(new Map());
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const selRef = useRef(selectedId);
  selRef.current = selectedId;

  /* 选中节点的关联鱼集合 */
  const relatedIds = useMemo(() => {
    const s = new Set<number>();
    if (selectedId == null) return s;
    for (const r of relations) {
      if (r.sourceId === selectedId) s.add(r.targetId);
      if (r.targetId === selectedId) s.add(r.sourceId);
    }
    for (const n of relatedNodes) s.add(n.id);
    // 兜底：entityDetail 无关系时用 graph edges（共同出现）
    if (s.size === 0) {
      for (const e of edges) {
        if (e.source === selectedId) s.add(e.target);
        if (e.target === selectedId) s.add(e.source);
      }
    }
    return s;
  }, [selectedId, relations, relatedNodes, edges]);

  /* 选中节点的邻接边（去重） */
  const adjEdges = useMemo(() => {
    if (selectedId == null) return [] as { a: number; b: number }[];
    const raw = relations
      .filter((r) => r.sourceId === selectedId || r.targetId === selectedId)
      .map((r) => ({ a: r.sourceId, b: r.targetId }));
    if (raw.length) {
      const dedup = new Map(raw.map((p) => [Math.min(p.a, p.b) + '|' + Math.max(p.a, p.b), p]));
      return [...dedup.values()];
    }
    const fromEdges = edges
      .filter((e) => e.source === selectedId || e.target === selectedId)
      .map((e) => ({ a: e.source, b: e.target }));
    const dedup = new Map(fromEdges.map((p) => [Math.min(p.a, p.b) + '|' + Math.max(p.a, p.b), p]));
    return [...dedup.values()];
  }, [selectedId, relations, edges]);

  /* 涟漪 / 大水纹（直接 DOM 注入，动画后移除）*/
  const ringAt = useCallback((x: number, y: number, size?: number) => {
    const pond = pondRef.current;
    if (!pond) return;
    const r = document.createElement('div');
    r.className = 'pond-ring';
    r.style.left = x + 'px';
    r.style.top = y + 'px';
    if (size) {
      r.style.width = size + 'px';
      r.style.height = size + 'px';
      r.style.marginLeft = (-size / 2) + 'px';
      r.style.marginTop = (-size / 2) + 'px';
    }
    pond.appendChild(r);
    setTimeout(() => r.remove(), 1400);
  }, []);

  const wakeAt = useCallback((x: number, y: number) => {
    const pond = pondRef.current;
    if (!pond) return;
    const w = document.createElement('div');
    w.className = 'pond-wake';
    w.style.left = x + 'px';
    w.style.top = y + 'px';
    pond.appendChild(w);
    setTimeout(() => w.remove(), 1200);
  }, []);

  /* 布局初始化 + 启动动画循环 */
  useEffect(() => {
    const pond = pondRef.current;
    if (!pond || nodes.length === 0) return;
    const W = pond.clientWidth || 800;
    const H = pond.clientHeight || 520;
    const st = new Map<number, FishState>();
    nodes.forEach((n, i) => {
      const layer = LAYER[n.type] ?? 0.5;
      st.set(n.id, {
        x: W * (0.12 + 0.76 * (((i * 37) % 100) / 100)),
        y: H * (0.16 + 0.68 * layer + (i % 3) * 0.05),
        heading: Math.random() * Math.PI * 2,
        speed: 0.28 + Math.random() * 0.2,
        turn: (Math.random() - 0.5) * 0.02,
        vx: 0, vy: 0,
        pull: null,
        orbitA: Math.random() * Math.PI * 2,
        isSelected: false,
        isRelated: false,
      });
    });
    stateRef.current = st;
    // 同步第一帧位置，避免 (0,0) 闪烁
    st.forEach((f, id) => {
      const el = fishRefs.current.get(id);
      if (el) el.style.transform = `translate(${f.x}px, ${f.y}px) rotate(${(f.heading * 180) / Math.PI}deg)`;
    });

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const p = pondRef.current;
      if (!p) { raf = requestAnimationFrame(loop); return; }
      const Ww = p.clientWidth, Hh = p.clientHeight;
      const cx = Ww / 2, cy = Hh / 2;
      stateRef.current.forEach((f, id) => {
        f.turn += (Math.random() - 0.5) * 0.01;
        f.turn = Math.max(-0.018, Math.min(0.018, f.turn));
        // 微引力：缓慢向中心漂移，避免全部贴边
        const dx = cx - f.x, dy = cy - f.y;
        const dist = Math.hypot(dx, dy) || 1;
        const towardCenter = dist > Math.min(Ww, Hh) * 0.42 ? 0.02 : 0.006;
        const target = Math.atan2(dy, dx) + Math.PI;
        f.heading += f.turn + ((target - f.heading + Math.PI) % (Math.PI * 2) - Math.PI) * towardCenter * 0.08;
        f.vx = Math.cos(f.heading) * f.speed;
        f.vy = Math.sin(f.heading) * f.speed;
        // 关联鱼聚拢 + 环形驻留（选中时）：靠拢但不挤成一团
        if (f.orbit) {
          const ob = f.orbit;
          // 相位缓慢环绕（呼吸感，避免冻结）
          ob.angle += dt * 0.35;
          // 目标点沿轨道缓慢绕行，半径轻微起伏（不是死钉在一点）
          const wob = Math.sin(ob.angle * 1.7) * 4;
          const tx = ob.ax + Math.cos(ob.angle) * (ob.radius + wob);
          const ty = ob.ay + Math.sin(ob.angle) * (ob.radius + wob);
          // 缓速逼近轨道（不硬拉）
          f.x += (tx - f.x) * 0.045;
          f.y += (ty - f.y) * 0.045;
          // 朝向顺着轨道方向（环绕感），仍保持游动
          const dir = ob.angle + Math.PI / 2;
          f.heading += (((dir - f.heading + Math.PI) % (Math.PI * 2)) - Math.PI) * 0.06;
        } else if (f.pull && now < f.pull.t) {
          // 吸引阶段（初始 600ms 逼近环）
          f.x += (f.pull.tx - f.x) * 0.06;
          f.y += (f.pull.ty - f.y) * 0.06;
        } else if (f.pull) {
          f.pull = null;
        }
        // 边界平滑软反弹（futao 修改②：边缘不抽搐）
        // 缓冲区 = 42px，进入后 heading 渐转（背离法线）+ 速度衰减，永不硬夹位置
        const BUF = 42;
        const targets: number[] = [];
        if (f.x < BUF) targets.push(0);
        if (f.x > Ww - BUF) targets.push(Math.PI);
        if (f.y < BUF) targets.push(Math.PI / 2);
        if (f.y > Hh - BUF) targets.push(-Math.PI / 2);
        if (targets.length) {
          // 取最接近当前 heading 的目标方向平滑逼近（避免相反方向急转）
          let best = targets[0], bd = Infinity;
          for (const t of targets) {
            let d = ((t - f.heading + Math.PI) % (Math.PI * 2)) - Math.PI;
            if (Math.abs(d) < bd) { bd = Math.abs(d); best = t; }
          }
          let d = ((best - f.heading + Math.PI) % (Math.PI * 2)) - Math.PI;
          f.heading += d * Math.min(1, 0.2);
          // 缓冲区内减速：越贴近边界越慢，柔和滑入再滑出
          const margin = Math.min(f.x, Ww - f.x, f.y, Hh - f.y);
          const slow = Math.min(1, Math.max(0.18, margin / BUF));
          f.x += f.vx * 60 * dt * slow * 0.65;
          f.y += f.vy * 60 * dt * slow * 0.65;
        } else {
          // 自由游动：选中鱼、聚拢中、环绕驻留中的鱼不叠加游动位移
          if (!f.isSelected && !f.pull && !f.orbit) {
            // ⑥ futao 修改：选中某鱼时，不相关鱼避开簇区（不靠近，防止叠一起影响阅读）
            const selId = selRef.current;
            if (selId != null && !f.isRelated) {
              const sel = stateRef.current.get(selId);
              if (sel) {
                const ddx = f.x - sel.x, ddy = f.y - sel.y;
                const dd = Math.hypot(ddx, ddy) || 1;
                // 簇半径：相关鱼轨道最远约 sel+~96px → 不相关鱼低于 150px 时被推离
                const REPEL = 150;
                if (dd < REPEL) {
                  const force = (1 - dd / REPEL) * 0.35;
                  f.x += (ddx / dd) * force * 60 * dt * 8;
                  f.y += (ddy / dd) * force * 60 * dt * 8;
                }
              }
            }
            f.x += f.vx * 60 * dt;
            f.y += f.vy * 60 * dt;
          }
        }
        // 偶尔泛起小水纹（游动时）
        if (Math.random() < 0.008 && !f.isSelected) {
          ringAt(f.x + Math.cos(f.heading) * 16, f.y + Math.sin(f.heading) * 16, 12);
        }
        const el = fishRefs.current.get(id);
        if (el) {
          // 鱼身随 heading 翻转（鱼身方向可变，鱼名独立定位永不受影响）
          const flip = Math.cos(f.heading) < 0 ? 'scale(-1,1) ' : '';
          el.style.transform = `translate(${f.x}px, ${f.y}px) ${flip} rotate(${(f.heading * 180) / Math.PI}deg)`;
          el.style.zIndex = String(Math.round(f.y));
        }
        // 鱼名：独立定位在鱼正下方，永不受 flip/rotate 影响 → 始终正向（futao 修改③）
        const nEl = nameRefs.current.get(id);
        if (nEl) {
          nEl.style.left = f.x + 'px';
          nEl.style.top = f.y + 'px';
          nEl.style.zIndex = String(Math.round(f.y) + 1);
        }
      });
      // 连线端点跟随鱼游动
      linkPathsRef.current.forEach((el, k) => {
        const [a, b] = k.split('|').map(Number);
        const fa = stateRef.current.get(a), fb = stateRef.current.get(b);
        if (!fa || !fb) return;
        const mx = (fa.x + fb.x) / 2, my = (fa.y + fb.y) / 2;
        el.setAttribute('d', `M ${fa.x} ${fa.y} Q ${mx} ${my - 18} ${fb.x} ${fb.y}`);
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [nodes, ringAt]);

  /* 选中变化：更新鱼态 + 泛大水纹 + 关联鱼环形聚拢（futao 修改④：靠拢不挤） */
  useEffect(() => {
    stateRef.current.forEach((f, id) => {
      f.isSelected = id === selectedId;
      f.isRelated = relatedIds.has(id);
    });
    if (selectedId != null) {
      const sel = stateRef.current.get(selectedId);
      const pond = pondRef.current;
      if (sel && pond) wakeAt(sel.x, sel.y);
      // 关联鱼环形分布：按当前角度排序 → 均匀展开一圈，每只分配固定环绕相位
      const relList = [...relatedIds].filter((rid) => rid !== selectedId);
      const rels = relList.length;
      if (rels > 0 && sel) {
        const angles = relList.map((rid) => {
          const o = stateRef.current.get(rid);
          return o ? Math.atan2(o.y - sel.y, o.x - sel.x) : 0;
        });
        const sorted = relList
          .map((rid, i) => ({ rid, a: angles[i] }))
          .sort((p, q) => p.a - q.a);
        const baseR = 46 + Math.min(24, rels * 4);
        const start = sorted[0].a - (rels - 1) * Math.PI / rels;
        sorted.forEach(({ rid }, i) => {
          const o = stateRef.current.get(rid);
          if (!o) return;
          const angle = start + (i / rels) * Math.PI * 2;
          let tx = sel.x + Math.cos(angle) * baseR;
          let ty = sel.y + Math.sin(angle) * baseR;
          // 聚拢目标不越出画布边缘（留 40px 缓冲）
          const M = 40;
          tx = Math.max(M, Math.min(pond!.clientWidth - M, tx));
          ty = Math.max(M, Math.min(pond!.clientHeight - M, ty));
          o.pull = { tx, ty, t: performance.now() + 600 };
          // 记录环绕轨道：选中期间持续在目标环上轻微呼吸，不冻结不拥挤
          o.orbit = { ax: sel.x, ay: sel.y, radius: Math.hypot(tx - sel.x, ty - sel.y) || baseR, angle };
        });
      }
    } else {
      // 取消选中：清除环绕轨道，关联鱼自然散开游走
      stateRef.current.forEach((f) => { f.orbit = null; });
    }
  }, [selectedId, relatedIds, wakeAt]);

  const hasSel = selectedId != null;

  return (
    <div
      className="pond-canvas"
      ref={pondRef}
      onDoubleClick={() => { if (selectedId != null) onSelect(selectedId); }}
    >
      {/* 图例 */}
      <div className="pond-legend">
        {Object.entries(ENTITY_TYPES).map(([k, v]) => (
          <span key={k}>
            <i style={{ background: v.color, boxShadow: `0 0 6px ${v.color}66` }} />
            {v.label}
          </span>
        ))}
      </div>

      {/* 关联连线层（选中才浮现） */}
      <svg className="pond-links">
        {adjEdges.map((e) => {
          const k = `${e.a}|${e.b}`;
          return (
            <path
              key={k}
              ref={(el) => {
                if (el) linkPathsRef.current.set(k, el);
                else linkPathsRef.current.delete(k);
              }}
              stroke="rgba(255,217,160,0.65)"
              strokeWidth="1.6"
              strokeDasharray="5 7"
              style={{ filter: 'drop-shadow(0 0 5px rgba(255,217,160,0.5))' }}
            />
          );
        })}
      </svg>

      {/* 鱼 + 独立鱼名（futao 修改③：鱼名永远正向，不受 flip/rotate 影响） */}
      {nodes.map((n) => {
        const isSel = n.id === selectedId;
        const isRel = hasSel && relatedIds.has(n.id);
        const color = isSel ? GOLD : (ENTITY_TYPES[n.type]?.color || FALLBACK_COLOR);
        const size = fishSize(n.diaryCount);
        return (
          <span key={n.id} className="fish-unit">
            <div
              ref={(el) => {
                if (el) fishRefs.current.set(n.id, el);
                else fishRefs.current.delete(n.id);
              }}
              className={`fish ${isSel ? 'selected' : ''} ${hoveredId === n.id ? 'hovered' : ''}`}
              style={{ color, opacity: hasSel ? (isSel || isRel ? 1 : 0.3) : 1 }}
              onClick={(e) => { e.stopPropagation(); onSelect(n.id); }}
              onMouseEnter={() => setHoveredId(n.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <span className="glow" />
              <FishIcon size={size} />
            </div>
            {/* 鱼名：pond 直接子级，JS 独立定位在鱼下方，永不变形 */}
            <span
              className={`fname ${isSel ? 'selected' : ''} ${hoveredId === n.id ? 'hovered' : ''}`}
              ref={(el) => {
                if (el) nameRefs.current.set(n.id, el);
                else nameRefs.current.delete(n.id);
              }}
            >
              {n.name}
            </span>
          </span>
        );
      })}

      {/* 底部提示 */}
      <div className="pond-hint">
        点一条鱼 → 变<b>月金</b> · 涟漪泛开 · 关联浮现
      </div>
    </div>
  );
}

/* ─── 知识图谱 ─── */

interface KGProps {
  /** Override data for controlled usage (e.g. storybook / testing) */
  data?: GraphData | null;
}

export default function KnowledgeGraph({ data: externalData }: KGProps) {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [rebuildStatus, setRebuildStatus] = useState<{ total: number; processed: number; stage: string } | null>(null);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [relatedDiaries, setRelatedDiaries] = useState<Diary[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [knowledgeItems, setKnowledgeItems] = useState<{ id: number; content: string; source: string }[]>([]);
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const [relatedNodes, setRelatedNodes] = useState<GraphNode[]>([]);
  const [relations, setRelations] = useState<GraphRelation[]>([]);

  const nodes: GraphNode[] = useMemo(() => (data?.nodes || []).map((n) => ({
    id: n.id, type: n.type, name: n.name, diaryCount: n.diaryCount,
    typeCn: (n as any).typeCn || ENTITY_TYPES[n.type]?.label || n.type,
  })), [data]);
  const edges: GraphEdge[] = useMemo(() => (data?.edges || []).map((e) => ({
    source: typeof e.source === 'number' ? e.source : (e.source as any).id,
    target: typeof e.target === 'number' ? e.target : (e.target as any).id,
    weight: e.weight,
    relation: e.relation,
  })), [data]);

  /* ── Load data ── */
  const loadGraph = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const graphData = await api.ragGraph();
      setData(graphData as unknown as GraphData);
    } catch {
      setError('知识图谱暂时不可用');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Init ── */
  useEffect(() => {
    if (!externalData) {
      loadGraph();
    } else {
      setData(externalData);
    }
  }, [externalData, loadGraph]);

  /* ── Extract entities ── */
  const handleExtract = useCallback(async () => {
    setExtracting(true);
    try {
      await api.ragExtractEntities({});
      const graphData = await api.ragGraph();
      setData(graphData as unknown as GraphData);
    } catch {
      setError('实体提取失败，请重试');
    } finally {
      setExtracting(false);
    }
  }, []);

  /* ── Full rebuild (auto + manual entry) ── */
  const handleRebuild = useCallback(async () => {
    setRebuilding(true);
    setRebuildStatus(null);
    setError('');
    try {
      // 优先用新的全量重建 API（林正树 task #22）；旧接口回退
      if (typeof (api as any).ragRebuildGraph === 'function') {
        const res = await (api as any).ragRebuildGraph({ force: true });
        if (res && res.success === false) {
          setError(res.error || '图谱重建失败，请重试');
          setRebuilding(false);
          return;
        }
        // 后台异步执行 → 轮询进度
        const pollStatus = async () => {
          try {
            const st = await api.ragRebuildStatus();
            setRebuildStatus({ total: st.total, processed: st.processed, stage: st.stage });
            if (st.running) {
              setTimeout(pollStatus, 1500);
            } else if (st.stage === 'done') {
              const graphData = await api.ragGraph();
              setData(graphData as unknown as GraphData);
              setRebuilding(false);
              setRebuildStatus(null);
            } else if (st.stage === 'error') {
              setError(st.error || '图谱重建失败');
              setRebuilding(false);
              setRebuildStatus(null);
            }
          } catch {
            setRebuilding(false);
            setRebuildStatus(null);
            setError('重建进度查询失败');
          }
        };
        pollStatus();
      } else {
        await api.ragExtractEntities({});
        const graphData = await api.ragGraph();
        setData(graphData as unknown as GraphData);
        setRebuilding(false);
      }
    } catch {
      setError('图谱重建失败，请重试');
      setRebuilding(false);
      setRebuildStatus(null);
    }
  }, []);

  /* ── Select node → load related diaries + knowledge + 关联实体 ── */
  const handleNodeClick = useCallback(async (nodeId: number) => {
    if (selectedId === nodeId) {
      setSelectedId(null);
      setRelatedDiaries([]);
      setKnowledgeItems([]);
      setRelatedNodes([]);
      setRelations([]);
      return;
    }
    setSelectedId(nodeId);
    setRelatedLoading(true);
    setKnowledgeLoading(true);
    try {
      const detail = await api.ragEntityDetail(nodeId);
      if (detail) {
        setRelatedDiaries(detail.diaries || []);
        // 关联实体（林正树：relatedEntities 返回 typeCn）
        setRelatedNodes(((detail as any).relatedEntities || []).map((r: any) => ({
          id: r.id, type: r.type, name: r.name,
          diaryCount: r.diaryCount || 0,
          typeCn: r.typeCn || ENTITY_TYPES[r.type]?.label || r.type,
        })));
        setRelations((detail as any).relations || []);
        const kb = (detail as any).knowledgeEntries;
        setKnowledgeItems(Array.isArray(kb) ? kb : []);
      }
    } catch {
      setRelatedDiaries([]);
      setKnowledgeItems([]);
    } finally {
      setRelatedLoading(false);
      setKnowledgeLoading(false);
    }
  }, [selectedId]);

  const selectedNodeObj = selectedId ? nodes.find((n) => n.id === selectedId) : null;
  const entityLabel = (type: string) => ENTITY_TYPES[type]?.label || '回忆';

  /* ── Render ── */
  return (
    <div>
      {/* Loading state */}
      {loading && (
        <div
          className="rounded-xl p-8 text-center"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}
        >
          <div className="text-3xl mb-3">🐟</div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>正在唤醒水下的回忆...</p>
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
          <div className="text-3xl mb-3">🐟</div>
          <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>水下还很安静，还没有回忆游进来</p>
          <p className="text-xs mb-4" style={{ color: 'var(--text-tertiary)' }}>
            图谱从你的日记中打捞人物、事件、地点、情绪、话题，化作一条条小鱼。
          </p>
          <button
            onClick={handleExtract}
            disabled={extracting}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
            style={{ background: 'var(--accent)', color: 'var(--accent-text)' }}
          >
            {extracting ? '⏳ 提取中...' : '✨ 从日记中提取'}
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

      {/* Toolbar */}
      {!loading && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <button
            onClick={handleExtract}
            disabled={extracting || rebuilding}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
            style={{
              background: 'radial-gradient(circle at 50% 50%, rgba(111,180,255,0.25) 0%, rgba(111,180,255,0.08) 60%, rgba(111,180,255,0.02) 100%)',
              color: '#6fb4ff',
              border: '1px solid rgba(111,180,255,0.18)',
              boxShadow: '0 0 4px rgba(111,180,255,0.08)',
            }}
          >
            {extracting ? (
              <>
                <span className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin inline-block" style={{ borderColor: '#6fb4ff', borderTopColor: 'transparent' }} />
                自动提取中…
              </>
            ) : (
              <>✨ 自动生成</>
            )}
          </button>
          <button
            onClick={handleRebuild}
            disabled={extracting || rebuilding}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
            style={{
              background: 'rgba(23,42,69,0.6)',
              color: '#8fa6c4',
              border: '1px solid rgba(45,74,117,0.5)',
            }}
          >
            {rebuilding ? (
              <>
                <span className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin inline-block" style={{ borderColor: '#8fa6c4', borderTopColor: 'transparent' }} />
                重建中…
              </>
            ) : (
              <>🔄 全量重建</>
            )}
          </button>
          <span className="ml-auto text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {nodes.length > 0 ? `${nodes.length} 条回忆 · ${edges.length} 条关联` : ''}
          </span>
        </div>
      )}

      {rebuildStatus && (
        <div className="mb-3 rounded-lg px-3 py-2 text-xs" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
          {rebuildStatus.stage}：{rebuildStatus.processed} / {rebuildStatus.total}
        </div>
      )}

      {/* 池塘画布 */}
      {!loading && nodes.length > 0 && (
        <div>
          <FishPond
            nodes={nodes}
            edges={edges}
            selectedId={selectedId}
            relatedNodes={relatedNodes}
            relations={relations}
            onSelect={handleNodeClick}
          />

          {/* 关联详情面板 */}
          {selectedNodeObj && (
            <div
              className="mt-4 rounded-xl p-4"
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium" style={{ color: GOLD }}>
                    {selectedNodeObj.name}
                  </span>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(255,217,160,0.1)', color: GOLD, border: '1px solid rgba(255,217,160,0.25)' }}
                  >
                    {selectedNodeObj.typeCn || entityLabel(selectedNodeObj.type)}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    — 出现在 {selectedNodeObj.diaryCount} 篇日记中
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent('nav-tab', { detail: { tab: 'treehole', knowledge: true } }))}
                    className="px-2 py-1 rounded-lg text-xs cursor-pointer transition-all"
                    style={{
                      background: 'rgba(23,42,69,0.6)',
                      color: '#8fa6c4',
                      border: '1px solid rgba(45,74,117,0.5)',
                    }}
                  >
                    查看知识库
                  </button>
                  <button
                    onClick={() => { setSelectedId(null); setRelatedDiaries([]); setKnowledgeItems([]); setRelatedNodes([]); setRelations([]); }}
                    className="p-1 rounded transition-colors"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                  </button>
                </div>
              </div>

              {/* 关联回忆（关联鱼 chips） */}
              {relatedNodes.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {relatedNodes.slice(0, 12).map((rn) => (
                    <span
                      key={rn.id}
                      className="text-[11px] px-2 py-0.5 rounded-full"
                      style={{
                        background: 'rgba(74,106,148,0.2)',
                        color: 'var(--text-secondary)',
                        border: `1px solid ${(ENTITY_TYPES[rn.type]?.color || FALLBACK_COLOR)}33`,
                      }}
                    >
                      <i
                        className="inline-block w-1.5 h-1.5 rounded-full mr-1"
                        style={{ background: ENTITY_TYPES[rn.type]?.color || FALLBACK_COLOR }}
                      />
                      {rn.name}
                    </span>
                  ))}
                </div>
              )}

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

              {/* 知识库关联条目 */}
              <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-default)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                    知识库关联
                  </span>
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent('nav-tab', { detail: { tab: 'treehole', knowledge: true } }))}
                    className="text-[11px] transition-all cursor-pointer"
                    style={{ color: '#6fb4ff' }}
                  >
                    查看全部 →
                  </button>
                </div>

                {knowledgeLoading && (
                  <div className="flex items-center gap-2 py-2">
                    <div className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>加载中...</span>
                  </div>
                )}

                {!knowledgeLoading && knowledgeItems.length === 0 && (
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {nodes.length > 0 ? '暂无关联知识库条目' : '暂无知识库数据'}
                  </p>
                )}

                {!knowledgeLoading && knowledgeItems.length > 0 && (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {knowledgeItems.slice(0, 5).map((k) => (
                      <div key={k.id} className="rounded-lg px-2.5 py-1.5" style={{ background: 'var(--bg-secondary)' }}>
                        <p className="text-xs line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                          {k.content?.slice(0, 80)}
                        </p>
                        <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                          {k.source === 'treehole' ? '涟漪对话' : k.source}
                        </span>
                      </div>
                    ))}
                    {knowledgeItems.length > 5 && (
                      <p className="text-[11px] text-center pt-1" style={{ color: 'var(--text-tertiary)' }}>
                        还有 {knowledgeItems.length - 5} 条，去知识库查看
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
