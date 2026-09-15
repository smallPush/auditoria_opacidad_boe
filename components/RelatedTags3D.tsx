import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, OrbitControls, Stars, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  RotateCw,
  Maximize2,
  Minimize2,
  Filter,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  FileText,
  MapPin,
  Tag,
  Activity,
  Layers,
  Network,
  X,
  Compass,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react';
import { AuditHistoryItem } from '../types';
import { translations, Language } from '../translations';

export interface RelatedTags3DProps {
  history: AuditHistoryItem[];
  lang: Language;
  isHistoryLoaded?: boolean;
}

export type TagCategory = 'all' | 'flag' | 'tipologia' | 'comunidad';

export interface AuditSnippet {
  boeId: string;
  title: string;
  transparency: number;
}

export interface GraphNode {
  id: string;
  name: string;
  count: number;
  avgTransparency: number;
  category: 'flag' | 'tipologia' | 'comunidad' | 'other';
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  degree: number;
  recentAudits: AuditSnippet[];
  connectedNeighbors: { name: string; strength: number; avgTransparency: number }[];
}

export interface LinkData {
  source: string;
  target: string;
  strength: number;
  avgTransparency: number;
}

export const getTransparencyColor = (transparency: number) => {
  if (transparency <= 35) return '#ef4444'; // red-500
  if (transparency <= 65) return '#f59e0b'; // amber-500
  return '#10b981'; // emerald-500
};

export const getCategoryBadge = (category: string, lang: Language) => {
  const isEs = lang === 'es';
  switch (category) {
    case 'flag':
      return {
        label: isEs ? 'Bandera Roja' : 'Red Flag',
        color: 'bg-red-500/10 text-red-400 border-red-500/20',
        icon: ShieldAlert
      };
    case 'tipologia':
      return {
        label: isEs ? 'Tipología' : 'Typology',
        color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
        icon: FileText
      };
    case 'comunidad':
      return {
        label: isEs ? 'Comunidad' : 'Region',
        color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
        icon: MapPin
      };
    default:
      return {
        label: isEs ? 'Concepto' : 'Concept',
        color: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
        icon: Tag
      };
  }
};

// Declarative line links using native R3F buffer management to avoid manual disposal lifecycle bugs
const NetworkLinksMesh: React.FC<{
  links: LinkData[];
  nodesMap: Map<string, GraphNode>;
  activeFocusId: string | null;
}> = ({ links, nodesMap, activeFocusId }) => {
  const baseCoords = useMemo(() => {
    const coords: number[] = [];
    for (let i = 0; i < links.length; i++) {
      const l = links[i];
      const s = nodesMap.get(l.source);
      const t = nodesMap.get(l.target);
      if (s && t && Number.isFinite(s.x) && Number.isFinite(t.x)) {
        coords.push(s.x, s.y, s.z, t.x, t.y, t.z);
      }
    }
    return coords.length > 0 ? new Float32Array(coords) : null;
  }, [links, nodesMap]);

  const highlightedCoords = useMemo(() => {
    if (!activeFocusId) return null;
    const coords: number[] = [];
    for (let i = 0; i < links.length; i++) {
      const l = links[i];
      if (l.source === activeFocusId || l.target === activeFocusId) {
        const s = nodesMap.get(l.source);
        const t = nodesMap.get(l.target);
        if (s && t && Number.isFinite(s.x) && Number.isFinite(t.x)) {
          coords.push(s.x, s.y, s.z, t.x, t.y, t.z);
        }
      }
    }
    return coords.length > 0 ? new Float32Array(coords) : null;
  }, [links, nodesMap, activeFocusId]);

  return (
    <group>
      {baseCoords && (
        <lineSegments key={`base-${baseCoords.length}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={baseCoords.length / 3}
              array={baseCoords}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color="#334155"
            transparent
            opacity={activeFocusId ? 0.12 : 0.35}
            depthWrite={false}
          />
        </lineSegments>
      )}
      {highlightedCoords && (
        <lineSegments key={`hl-${activeFocusId}-${highlightedCoords.length}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={highlightedCoords.length / 3}
              array={highlightedCoords}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color="#38bdf8"
            transparent
            opacity={0.9}
            depthWrite={false}
          />
        </lineSegments>
      )}
    </group>
  );
};

// Shared geometries to drastically reduce GPU memory allocations
const SHARED_SPHERE_GEOM = new THREE.SphereGeometry(1, 14, 14);
const SHARED_RING_GEOM = new THREE.RingGeometry(1.35, 1.6, 32);

// Memoized Single Node 3D Mesh
const NetworkNodeItem = React.memo<{
  node: GraphNode;
  isSelected: boolean;
  isHovered: boolean;
  isConnectedToActive: boolean;
  isDimmed: boolean;
  showLabel: boolean;
  onSelect: (node: GraphNode) => void;
  onHover: (node: GraphNode | null) => void;
}>(({
  node,
  isSelected,
  isHovered,
  isConnectedToActive,
  isDimmed,
  showLabel,
  onSelect,
  onHover
}) => {
  const size = Math.max(0.35, Math.min(1.25, 0.35 + Math.log2(node.count + 1) * 0.15));
  const color = getTransparencyColor(node.avgTransparency);
  const scale = isHovered ? 1.35 : isSelected ? 1.25 : 1.0;
  const meshScale = size * scale;

  return (
    <group position={[node.x, node.y, node.z]}>
      <mesh
        geometry={SHARED_SPHERE_GEOM}
        scale={[meshScale, meshScale, meshScale]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(node);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (typeof document !== 'undefined') {
            document.body.style.cursor = 'pointer';
          }
          onHover(node);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          if (typeof document !== 'undefined') {
            document.body.style.cursor = 'auto';
          }
          onHover(null);
        }}
      >
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isSelected || isHovered ? 1.0 : isConnectedToActive ? 0.7 : 0.35}
          roughness={0.25}
          metalness={0.35}
          transparent
          opacity={isDimmed ? 0.12 : 0.95}
        />
      </mesh>

      {/* Glowing targeting ring for selected node */}
      {isSelected && (
        <mesh
          geometry={SHARED_RING_GEOM}
          scale={[size, size, size]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <meshBasicMaterial color="#38bdf8" side={THREE.DoubleSide} transparent opacity={0.85} />
        </mesh>
      )}

      {/* Billboard text label */}
      {showLabel && !isDimmed && (
        <Billboard position={[0, size * scale + 0.35, 0]}>
          <Text
            fontSize={Math.max(0.3, size * 0.52)}
            color={isSelected ? '#38bdf8' : isHovered ? '#ffffff' : '#cbd5e1'}
            anchorX="center"
            anchorY="bottom"
            outlineWidth={0.03}
            outlineColor="#020617"
          >
            {`${node.name} (${Math.round(node.avgTransparency)}%)`}
          </Text>
        </Billboard>
      )}
    </group>
  );
});

// 3D Scene Controller
const SceneController: React.FC<{
  nodes: GraphNode[];
  links: LinkData[];
  selectedNode: GraphNode | null;
  hoveredNode: GraphNode | null;
  searchQuery: string;
  autoRotate: boolean;
  cameraTarget: [number, number, number] | null;
  onSelectNode: (node: GraphNode) => void;
  onHoverNode: (node: GraphNode | null) => void;
}> = ({
  nodes,
  links,
  selectedNode,
  hoveredNode,
  searchQuery,
  autoRotate,
  cameraTarget,
  onSelectNode,
  onHoverNode
}) => {
  const controlsRef = useRef<any>(null);
  const groupRef = useRef<THREE.Group>(null);
  const nodesMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const activeFocusId = selectedNode?.id || hoveredNode?.id || null;

  // Set of node IDs connected to active selected/hovered node
  const connectedIds = useMemo(() => {
    if (!activeFocusId) return new Set<string>();
    const ids = new Set<string>();
    links.forEach((l) => {
      if (l.source === activeFocusId) ids.add(l.target);
      if (l.target === activeFocusId) ids.add(l.source);
    });
    return ids;
  }, [activeFocusId, links]);

  // Set of top 8 landmark hub nodes to always show landmarks (keeps text count low for high FPS)
  const landmarkHubIds = useMemo(() => {
    const sorted = [...nodes].sort((a, b) => b.degree - a.degree || b.count - a.count);
    return new Set(sorted.slice(0, 8).map((n) => n.id));
  }, [nodes]);

  // Top 6 connected neighbor IDs of the focused node to show labels for (prevents 40 text spikes)
  const connectedLabelIds = useMemo(() => {
    if (!activeFocusId) return new Set<string>();
    const node = nodesMap.get(activeFocusId);
    if (!node || !node.connectedNeighbors) return new Set<string>();
    const ids = new Set<string>();
    node.connectedNeighbors.slice(0, 6).forEach((nb) => {
      ids.add(nb.name);
    });
    return ids;
  }, [activeFocusId, nodesMap]);

  // Frame tick: smooth camera lerp with snap threshold to avoid unbounded continuous render loops
  useFrame(() => {
    if (controlsRef.current && cameraTarget) {
      const target = controlsRef.current.target;
      const dx = cameraTarget[0] - target.x;
      const dy = cameraTarget[1] - target.y;
      const dz = cameraTarget[2] - target.z;
      const distSq = dx * dx + dy * dy + dz * dz;

      if (distSq > 0.0001) {
        target.x += dx * 0.08;
        target.y += dy * 0.08;
        target.z += dz * 0.08;
        controlsRef.current.update();
      } else if (distSq > 0) {
        target.x = cameraTarget[0];
        target.y = cameraTarget[1];
        target.z = cameraTarget[2];
        controlsRef.current.update();
      }
    }
  });

  const handleSelectNode = useCallback((node: GraphNode) => {
    onSelectNode(node);
  }, [onSelectNode]);

  const handleHoverNode = useCallback((node: GraphNode | null) => {
    onHoverNode(node);
  }, [onHoverNode]);

  return (
    <>
      <OrbitControls
        ref={controlsRef}
        autoRotate={autoRotate}
        autoRotateSpeed={0.35}
        enableDamping
        dampingFactor={0.06}
        rotateSpeed={0.6}
        zoomSpeed={0.8}
        minDistance={5}
        maxDistance={95}
      />

      <group ref={groupRef}>
        <NetworkLinksMesh links={links} nodesMap={nodesMap} activeFocusId={activeFocusId} />

        {nodes.map((node) => {
          const isSelected = selectedNode?.id === node.id;
          const isHovered = hoveredNode?.id === node.id;
          const isConnected = connectedIds.has(node.id);
          const matchesSearch =
            searchQuery.trim() !== '' &&
            node.name.toLowerCase().includes(searchQuery.toLowerCase());
          const isDimmed =
            searchQuery.trim() !== ''
              ? !matchesSearch
              : activeFocusId !== null && !isSelected && !isHovered && !isConnected;

          const showLabel =
            isSelected ||
            isHovered ||
            connectedLabelIds.has(node.id) ||
            matchesSearch ||
            (activeFocusId === null && landmarkHubIds.has(node.id));

          return (
            <NetworkNodeItem
              key={node.id}
              node={node}
              isSelected={isSelected}
              isHovered={isHovered}
              isConnectedToActive={isConnected}
              isDimmed={isDimmed}
              showLabel={showLabel}
              onSelect={handleSelectNode}
              onHover={handleHoverNode}
            />
          );
        })}
      </group>
    </>
  );
};

export const RelatedTags3D: React.FC<RelatedTags3DProps> = ({
  history,
  lang,
  isHistoryLoaded
}) => {
  const navigate = useNavigate();
  const t = translations[lang] || translations.es;

  // View state
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TagCategory>('all');
  const [nodeLimitPreset, setNodeLimitPreset] = useState<number>(80);
  const [minFrequency, setMinFrequency] = useState<number>(2);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isControlsCollapsed, setIsControlsCollapsed] = useState<boolean>(false);
  const [cameraTarget, setCameraTarget] = useState<[number, number, number] | null>([0, 0, 0]);
  const [visibleHubsCount, setVisibleHubsCount] = useState<number>(12);

  const containerRef = useRef<HTMLDivElement>(null);

  // Parse tag statistics and co-occurrences
  const rawGraphData = useMemo(() => {
    const tagStats = new Map<
      string,
      {
        count: number;
        totalTransparency: number;
        category: 'flag' | 'tipologia' | 'comunidad' | 'other';
        recentAudits: AuditSnippet[];
      }
    >();
    const coOccurMap = new Map<string, { strength: number; totalTrans: number }>();
    let maxCountFound = 1;

    const isTagValid = (tag: string, title?: string) => {
      if (!tag || typeof tag !== 'string') return false;
      const trimmed = tag.trim();
      if (trimmed.length < 2 || trimmed.length > 75) return false;
      if (title && trimmed === title.trim()) return false;
      if (trimmed.split(/\s+/).length > 8) return false;
      if (trimmed.startsWith('Resolución de ') || trimmed.startsWith('Orden de ')) return false;
      return true;
    };

    history.forEach((item) => {
      const tagsWithCategory = new Map<
        string,
        'flag' | 'tipologia' | 'comunidad' | 'other'
      >();

      const audit = item.audit || {};
      const score = typeof audit.nivel_transparencia === 'number' ? audit.nivel_transparencia : 50;

      if (audit.banderas_rojas && Array.isArray(audit.banderas_rojas)) {
        audit.banderas_rojas.forEach((flag) => {
          if (isTagValid(flag, item.title)) {
            tagsWithCategory.set(flag.trim(), 'flag');
          }
        });
      }

      if (audit.tipologia && isTagValid(audit.tipologia, item.title)) {
        const trimmed = audit.tipologia.trim();
        if (!tagsWithCategory.has(trimmed)) {
          tagsWithCategory.set(trimmed, 'tipologia');
        }
      }

      if (audit.comunidad_autonoma && isTagValid(audit.comunidad_autonoma, item.title)) {
        const trimmed = audit.comunidad_autonoma.trim();
        if (!tagsWithCategory.has(trimmed)) {
          tagsWithCategory.set(trimmed, 'comunidad');
        }
      }

      const uniqueTags = Array.from(tagsWithCategory.entries());

      uniqueTags.forEach(([tag, cat]) => {
        const existing = tagStats.get(tag) || {
          count: 0,
          totalTransparency: 0,
          category: cat,
          recentAudits: []
        };
        existing.count += 1;
        existing.totalTransparency += score;
        if (existing.recentAudits.length < 4) {
          existing.recentAudits.push({
            boeId: item.boeId,
            title: item.title || item.boeId,
            transparency: score
          });
        }
        tagStats.set(tag, existing);
        if (existing.count > maxCountFound) maxCountFound = existing.count;
      });

      for (let i = 0; i < uniqueTags.length; i++) {
        for (let j = i + 1; j < uniqueTags.length; j++) {
          const t1 = uniqueTags[i][0];
          const t2 = uniqueTags[j][0];
          // Optimized key generation without array allocations
          const key = t1 < t2 ? `${t1}|${t2}` : `${t2}|${t1}`;
          const curr = coOccurMap.get(key) || { strength: 0, totalTrans: 0 };
          curr.strength += 1;
          curr.totalTrans += score;
          coOccurMap.set(key, curr);
        }
      }
    });

    return { tagStats, coOccurMap, maxCountFound };
  }, [history]);

  // Filter and Layout Calculation (Synchronous, high-performance force layout)
  const { nodes, links, topPairs, avgNetworkTransparency } = useMemo(() => {
    const { tagStats, coOccurMap } = rawGraphData;
    if (tagStats.size === 0) {
      return { nodes: [], links: [], topPairs: [], avgNetworkTransparency: 0 };
    }

    // 1. Filter candidate tags
    let candidateTags = Array.from(tagStats.entries()).filter(([name, stat]) => {
      if (stat.count < minFrequency) return false;
      if (selectedCategory !== 'all' && stat.category !== selectedCategory) return false;
      if (searchQuery.trim() !== '') {
        return name.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    });

    // Fallback: If minFrequency filtered out everything but there are matching tags with count >= 1
    if (candidateTags.length === 0 && minFrequency > 1 && searchQuery.trim() === '' && selectedCategory === 'all') {
      candidateTags = Array.from(tagStats.entries()).filter(([_, stat]) => stat.count >= 1);
    }

    // Sort by count descending and apply nodeLimitPreset
    candidateTags.sort((a, b) => b[1].count - a[1].count);
    if (nodeLimitPreset !== Infinity && candidateTags.length > nodeLimitPreset) {
      candidateTags = candidateTags.slice(0, nodeLimitPreset);
    }

    const activeNodeIds = new Set(candidateTags.map(([name]) => name));

    // 2. Filter links between active nodes
    const filteredLinks: LinkData[] = [];
    const degreeMap = new Map<string, number>();
    const neighborsMap = new Map<
      string,
      { name: string; strength: number; avgTransparency: number }[]
    >();

    coOccurMap.forEach((data, key) => {
      const sepIndex = key.indexOf('|');
      const source = key.slice(0, sepIndex);
      const target = key.slice(sepIndex + 1);
      if (activeNodeIds.has(source) && activeNodeIds.has(target)) {
        const avgTrans = data.strength > 0 ? data.totalTrans / data.strength : 50;
        filteredLinks.push({
          source,
          target,
          strength: data.strength,
          avgTransparency: avgTrans
        });

        degreeMap.set(source, (degreeMap.get(source) || 0) + 1);
        degreeMap.set(target, (degreeMap.get(target) || 0) + 1);

        const sourceNeighbors = neighborsMap.get(source) || [];
        sourceNeighbors.push({ name: target, strength: data.strength, avgTransparency: avgTrans });
        neighborsMap.set(source, sourceNeighbors);

        const targetNeighbors = neighborsMap.get(target) || [];
        targetNeighbors.push({ name: source, strength: data.strength, avgTransparency: avgTrans });
        neighborsMap.set(target, targetNeighbors);
      }
    });

    // Sort neighbors by strength
    neighborsMap.forEach((list) => {
      list.sort((a, b) => b.strength - a.strength);
    });

    // 3. Initial Placement using Fibonacci Sphere with degree stratification
    const totalCandidates = candidateTags.length;
    const initialNodes: GraphNode[] = candidateTags.map(([name, stat], i) => {
      const deg = degreeMap.get(name) || 0;
      // Stratify: high degree nodes placed on tighter radius
      const baseRadius = 8 + (1 - Math.min(deg / 15, 1)) * 14;
      const phi = Math.acos(1 - 2 * ((i + 0.5) / Math.max(totalCandidates, 1)));
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;

      const x = baseRadius * Math.sin(phi) * Math.cos(theta);
      const y = baseRadius * Math.sin(phi) * Math.sin(theta);
      const z = baseRadius * Math.cos(phi);

      return {
        id: name,
        name,
        count: stat.count,
        avgTransparency: stat.count > 0 ? stat.totalTransparency / stat.count : 50,
        category: stat.category,
        x,
        y,
        z,
        vx: 0,
        vy: 0,
        vz: 0,
        degree: deg,
        recentAudits: stat.recentAudits,
        connectedNeighbors: neighborsMap.get(name) || []
      };
    });

    // 4. Synchronous high-performance force relaxation
    const nodeMap = new Map(initialNodes.map((n) => [n.id, n]));
    const resolvedLinks = filteredLinks
      .map((l) => ({
        a: nodeMap.get(l.source),
        b: nodeMap.get(l.target),
        strength: l.strength
      }))
      .filter((l): l is { a: GraphNode; b: GraphNode; strength: number } => Boolean(l.a && l.b));

    const totalNodes = initialNodes.length;
    const steps = Math.min(45, Math.max(25, 55 - Math.floor(totalNodes / 5)));

    for (let step = 0; step < steps; step++) {
      const alpha = Math.pow(1 - step / steps, 1.5) * 0.45;

      // Pairwise repulsion
      for (let i = 0; i < totalNodes; i++) {
        const a = initialNodes[i];
        for (let j = i + 1; j < totalNodes; j++) {
          const b = initialNodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dz = a.z - b.z;
          const distSq = dx * dx + dy * dy + dz * dz || 0.1;
          const invDist = 1 / Math.sqrt(distSq);
          const force = (4.5 / distSq) * alpha;
          const factor = invDist * force;
          const fx = dx * factor;
          const fy = dy * factor;
          const fz = dz * factor;
          a.vx += fx;
          a.vy += fy;
          a.vz += fz;
          b.vx -= fx;
          b.vy -= fy;
          b.vz -= fz;
        }
      }

      // Spring attraction along links
      for (let i = 0; i < resolvedLinks.length; i++) {
        const { a, b, strength } = resolvedLinks[i];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.1;
        const targetLen = 6.0;
        const force = (dist - targetLen) * 0.045 * Math.min(strength, 4) * alpha;
        const invDist = 1 / dist;
        const fx = dx * invDist * force;
        const fy = dy * invDist * force;
        const fz = dz * invDist * force;
        a.vx += fx;
        a.vy += fy;
        a.vz += fz;
        b.vx -= fx;
        b.vy -= fy;
        b.vz -= fz;
      }

      // Apply damping and update positions safely
      for (let i = 0; i < totalNodes; i++) {
        const n = initialNodes[i];
        n.vx -= n.x * 0.003 * alpha;
        n.vy -= n.y * 0.003 * alpha;
        n.vz -= n.z * 0.003 * alpha;

        n.vx *= 0.85;
        n.vy *= 0.85;
        n.vz *= 0.85;

        // Clamp speed
        const speed = Math.sqrt(n.vx * n.vx + n.vy * n.vy + n.vz * n.vz);
        if (speed > 0.3) {
          const invSpeed = 0.3 / speed;
          n.vx *= invSpeed;
          n.vy *= invSpeed;
          n.vz *= invSpeed;
        }

        n.x += n.vx;
        n.y += n.vy;
        n.z += n.vz;
      }
    }

    // Top pairs for 2D explorer view
    const sortedPairs = [...filteredLinks]
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 36);

    const totalTrans = initialNodes.reduce((acc, n) => acc + n.avgTransparency, 0);
    const avgTrans = initialNodes.length > 0 ? Math.round(totalTrans / initialNodes.length) : 50;

    return {
      nodes: initialNodes,
      links: filteredLinks,
      topPairs: sortedPairs,
      avgNetworkTransparency: avgTrans
    };
  }, [rawGraphData, minFrequency, selectedCategory, searchQuery, nodeLimitPreset]);

  // Keep selected node updated if nodes array recalculates
  useEffect(() => {
    if (selectedNode) {
      const found = nodes.find((n) => n.id === selectedNode.id);
      setSelectedNode(found || null);
    }
  }, [nodes]);

  const handleNodeSelect = useCallback((node: GraphNode) => {
    setSelectedNode(node);
    setCameraTarget([node.x, node.y, node.z]);
  }, []);

  const handleResetCamera = useCallback(() => {
    setCameraTarget([0, 0, 0]);
  }, []);

  const handleJumpToTagHistory = useCallback((tagName: string) => {
    navigate(`/history?tags=${encodeURIComponent(tagName)}`);
  }, [navigate]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  // Show loading skeleton when history is being fetched
  if (isHistoryLoaded === false) {
    return (
      <div className="h-[650px] flex flex-col items-center justify-center text-slate-400 bg-slate-950/80 rounded-3xl border border-slate-800 p-8 text-center space-y-4 shadow-2xl">
        <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-400 animate-spin">
          <Loader2 size={36} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white mb-1">{t.conceptNetworkTitle}</h3>
          <p className="text-sm text-slate-400 max-w-md">{t.loadingNetwork}</p>
        </div>
      </div>
    );
  }

  // Empty state when no history exists
  if (history.length === 0) {
    return (
      <div className="h-[650px] flex flex-col items-center justify-center text-slate-400 bg-slate-950/80 rounded-3xl border border-slate-800 p-8 text-center space-y-4 shadow-2xl">
        <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-400 animate-pulse">
          <Network size={36} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white mb-1">{t.conceptNetworkTitle}</h3>
          <p className="text-sm text-slate-400 max-w-md">{t.notEnoughDataNetwork}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`transition-all duration-300 flex flex-col ${
        isFullscreen
          ? 'fixed inset-0 z-50 bg-slate-950 p-4 md:p-6'
          : 'h-[85vh] min-h-[580px] w-full bg-slate-950 rounded-3xl border border-slate-800/80 overflow-hidden shadow-2xl relative'
      }`}
    >
      {/* Top Header & Analytics Bar */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-3 p-3.5 md:p-4 md:px-6 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl border border-indigo-500/30 text-indigo-400 shadow-inner">
            <Network size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base md:text-lg font-black text-white tracking-tight">
                {t.conceptNetworkTitle}
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                <Sparkles size={10} />
                Civic Intel
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              {t.conceptNetworkSubtitle}
            </p>
          </div>
        </div>

        {/* View Mode Switcher & Global KPIs */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Quick Metrics Badges */}
          <div className="hidden lg:flex items-center gap-2 text-xs font-semibold text-slate-300">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/70 border border-slate-700/50">
              <Layers size={14} className="text-indigo-400" />
              <span>
                <strong className="text-white font-mono">{nodes.length}</strong> {t.activeConcepts}
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/70 border border-slate-700/50">
              <Activity size={14} className="text-cyan-400" />
              <span>
                <strong className="text-white font-mono">{links.length}</strong> {t.connectionsCount}
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/70 border border-slate-700/50">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: getTransparencyColor(avgNetworkTransparency) }}
              />
              <span>
                {t.avgTransparency}:{' '}
                <strong className="text-white font-mono">{avgNetworkTransparency}%</strong>
              </span>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('3d')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === '3d'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Compass size={14} />
              <span>{t.networkView3D}</span>
            </button>
            <button
              onClick={() => setViewMode('2d')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === '2d'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText size={14} />
              <span>{t.networkView2D}</span>
            </button>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-1.5">
            {viewMode === '3d' && (
              <>
                <button
                  onClick={() => setAutoRotate((prev) => !prev)}
                  title={t.autoRotate}
                  className={`p-2 rounded-xl border transition-all ${
                    autoRotate
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                      : 'bg-slate-800/80 text-slate-400 border-slate-700/50 hover:text-white'
                  }`}
                >
                  <RotateCw size={15} className={autoRotate ? 'animate-spin-slow' : ''} />
                </button>
                <button
                  onClick={handleResetCamera}
                  title={t.resetCamera}
                  className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/50 text-slate-300 hover:text-white transition-all"
                >
                  <Compass size={15} />
                </button>
              </>
            )}
            <button
              onClick={toggleFullscreen}
              title={t.toggleFullscreen}
              className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/50 text-slate-300 hover:text-white transition-all"
            >
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative flex-1 w-full min-h-0 overflow-hidden">
        {/* Floating Controls HUD (Available in 3D and 2D mode) */}
        <div className="absolute top-3 left-3 z-20 max-w-xs w-[calc(100%-24px)] md:w-80 pointer-events-none transition-all duration-300">
          <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-3 shadow-2xl space-y-2.5 pointer-events-auto">
            {/* Search Input Bar with Collapse Toggle */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 bg-slate-950/80 px-2.5 py-1.5 rounded-xl border border-slate-800 focus-within:border-indigo-500/50 transition-colors">
                <Search size={14} className="text-slate-400 flex-shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.searchConceptPlaceholder}
                  className="bg-transparent border-none outline-none text-xs text-white placeholder:text-slate-500 w-full"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-slate-400 hover:text-white p-0.5"
                    title={t.closePanel}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
              <button
                onClick={() => setIsControlsCollapsed((prev) => !prev)}
                className="p-1.5 rounded-lg bg-slate-800/60 border border-slate-700/40 text-slate-400 hover:text-white text-xs flex items-center gap-1"
                title={isControlsCollapsed ? t.expand : t.collapse}
              >
                <Filter size={13} />
                {isControlsCollapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
              </button>
            </div>

            {/* Expandable Filter Details */}
            {!isControlsCollapsed && (
              <div className="space-y-2.5 pt-1 animate-in fade-in duration-200">
                {/* Category Filter Pills */}
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    {t.filterByCategory}
                  </span>
                  <div className="grid grid-cols-2 gap-1 text-[11px]">
                    {(
                      [
                        { key: 'all', label: t.categoryAll },
                        { key: 'flag', label: t.categoryRedFlags },
                        { key: 'tipologia', label: t.categoryTypology },
                        { key: 'comunidad', label: t.categoryRegion }
                      ] as const
                    ).map((cat) => (
                      <button
                        key={cat.key}
                        onClick={() => setSelectedCategory(cat.key)}
                        className={`px-2 py-1 rounded-lg font-medium transition-all text-left truncate ${
                          selectedCategory === cat.key
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Density Presets */}
                <div>
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    <span>{t.nodeDensity}</span>
                    <span className="text-indigo-400 font-mono">
                      {nodes.length} / {rawGraphData.tagStats.size}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-[10px]">
                    {[
                      { limit: 40, label: t.presetFast },
                      { limit: 80, label: t.presetBalanced },
                      { limit: 160, label: t.presetFull }
                    ].map((p) => (
                      <button
                        key={p.limit}
                        onClick={() => setNodeLimitPreset(p.limit)}
                        className={`py-1 rounded-lg font-bold text-center transition-all truncate px-1 ${
                          nodeLimitPreset === p.limit
                            ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                            : 'bg-slate-800/40 text-slate-400 hover:text-white'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Min Frequency Slider */}
                <div>
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    <span>{t.minFrequency}</span>
                    <span className="text-blue-400 font-mono font-bold">{minFrequency}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max={Math.max(2, Math.min(25, rawGraphData.maxCountFound))}
                    step="1"
                    value={minFrequency}
                    onChange={(e) => setMinFrequency(parseInt(e.target.value) || 1)}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                {/* Transparency Legend */}
                <div className="pt-2 border-t border-slate-800/80">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    {t.transparencyLevelLegend}
                  </span>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      <span>{t.legendCritical}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span>{t.legendWarning}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>{t.legendTransparent}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Concept Inspector (Responsive: sliding drawer on desktop, bottom sheet on mobile) */}
        {selectedNode && (
          <div className="fixed md:absolute bottom-0 md:bottom-auto md:top-3 right-0 md:right-3 left-0 md:left-auto z-30 max-w-full md:max-w-sm w-full pointer-events-none animate-in slide-in-from-bottom md:slide-in-from-right-4 duration-300">
            <div className="bg-slate-900/95 backdrop-blur-xl border-t md:border border-slate-700/70 rounded-t-3xl md:rounded-2xl p-4 shadow-2xl space-y-3 pointer-events-auto max-h-[70vh] md:max-h-[calc(100vh-140px)] overflow-y-auto custom-scrollbar">
              {/* Drag Handle for Mobile */}
              <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto md:hidden mb-1" />

              {/* Inspector Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  {(() => {
                    const badge = getCategoryBadge(selectedNode.category, lang);
                    const Icon = badge.icon;
                    return (
                      <div
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border mb-1.5 ${badge.color}`}
                      >
                        <Icon size={11} />
                        <span>{badge.label}</span>
                      </div>
                    );
                  })()}
                  <h3 className="text-base font-bold text-white leading-snug">
                    {selectedNode.name}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
                  title={t.closePanel}
                >
                  <X size={15} />
                </button>
              </div>

              {/* Transparency Gauge Bar */}
              <div className="p-2.5 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">{t.transparencyLevel}</span>
                  <span
                    className="font-mono font-bold text-sm"
                    style={{ color: getTransparencyColor(selectedNode.avgTransparency) }}
                  >
                    {Math.round(selectedNode.avgTransparency)}%
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(5, Math.min(100, selectedNode.avgTransparency))}%`,
                      backgroundColor: getTransparencyColor(selectedNode.avgTransparency)
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>{t.occurrencesInBoe}:</span>
                  <strong className="text-slate-300 font-mono">{selectedNode.count}</strong>
                </div>
              </div>

              {/* Connected Concepts Pills */}
              {selectedNode.connectedNeighbors.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {t.connectedConcepts} ({selectedNode.connectedNeighbors.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto custom-scrollbar">
                    {selectedNode.connectedNeighbors.slice(0, 10).map((neighbor) => (
                      <button
                        key={neighbor.name}
                        onClick={() => {
                          const target = nodes.find((n) => n.id === neighbor.name);
                          if (target) handleNodeSelect(target);
                        }}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700/60 transition-colors"
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            backgroundColor: getTransparencyColor(neighbor.avgTransparency)
                          }}
                        />
                        <span className="truncate max-w-[130px]">{neighbor.name}</span>
                        <span className="text-[10px] font-mono text-indigo-400 font-semibold">
                          ({neighbor.strength})
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Audits Matching Tag */}
              {selectedNode.recentAudits.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {t.relatedAudits}
                  </span>
                  <div className="space-y-1.5">
                    {selectedNode.recentAudits.map((audit) => (
                      <div
                        key={audit.boeId}
                        onClick={() => navigate(`/audit/${audit.boeId}`)}
                        className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-indigo-500/40 hover:bg-slate-800/40 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center justify-between text-xs mb-0.5">
                          <span className="font-mono text-[11px] text-indigo-400 group-hover:underline">
                            {audit.boeId}
                          </span>
                          <span
                            className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: `${getTransparencyColor(audit.transparency)}15`,
                              color: getTransparencyColor(audit.transparency)
                            }}
                          >
                            {audit.transparency}%
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-1">
                          {audit.title}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Inspector Action Buttons */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
                <button
                  onClick={() => handleJumpToTagHistory(selectedNode.name)}
                  className="flex-1 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-900/30"
                >
                  <span>{t.viewInHistory}</span>
                  <ExternalLink size={13} />
                </button>
                {viewMode === '3d' && (
                  <button
                    onClick={() => setCameraTarget([selectedNode.x, selectedNode.y, selectedNode.z])}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                    title={t.resetCamera}
                  >
                    <Compass size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {viewMode === '3d' ? (
          <>
            {/* Overlay if 0 nodes match filter */}
            {nodes.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 p-6 text-center">
                <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-6 max-w-sm pointer-events-auto shadow-2xl space-y-3">
                  <div className="w-10 h-10 mx-auto rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Filter size={20} />
                  </div>
                  <h4 className="text-sm font-bold text-white">{t.noConceptsFound}</h4>
                  <p className="text-xs text-slate-400">
                    {lang === 'es'
                      ? 'Ningún concepto coincide con los filtros actuales o la frecuencia mínima.'
                      : 'No concepts match the current filters or minimum frequency.'}
                  </p>
                  {(selectedCategory !== 'all' || searchQuery || minFrequency > 1) && (
                    <button
                      onClick={() => {
                        setSelectedCategory('all');
                        setSearchQuery('');
                        setMinFrequency(1);
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors"
                    >
                      {t.resetFilters}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Bottom Interaction Guide */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none hidden md:block">
              <div className="px-3.5 py-1.5 bg-slate-900/80 backdrop-blur-md rounded-full border border-slate-800 text-[11px] text-slate-400 shadow-xl flex items-center gap-2">
                <span>{t.nodeConnectionsHint}</span>
                <span className="text-slate-600">•</span>
                <span>{t.controlsHint3d}</span>
              </div>
            </div>

            {/* Three.js High-Performance Canvas */}
            <Canvas
              camera={{ position: [0, 0, 32], fov: 48 }}
              gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
              dpr={[1, 1.5]}
            >
              <color attach="background" args={['#020617']} />
              <fog attach="fog" args={['#020617', 15, 80]} />
              <ambientLight intensity={0.55} />
              <pointLight position={[20, 20, 20]} intensity={1.2} color="#ffffff" />
              <pointLight position={[-20, -20, -20]} intensity={0.6} color="#38bdf8" />

              <Stars
                radius={90}
                depth={45}
                count={350}
                factor={3}
                saturation={0}
                fade
                speed={0.2}
              />

              <SceneController
                nodes={nodes}
                links={links}
                selectedNode={selectedNode}
                hoveredNode={hoveredNode}
                searchQuery={searchQuery}
                autoRotate={autoRotate}
                cameraTarget={cameraTarget}
                onSelectNode={handleNodeSelect}
                onHoverNode={setHoveredNode}
              />
            </Canvas>
          </>
        ) : (
          /* 2D Analytical Relationships & Hubs View */
          <div className="w-full h-full overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar bg-slate-950 pt-20 md:pt-6 md:pl-[340px]">
            {/* Top Hubs Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Activity size={18} className="text-indigo-400" />
                    <span>{t.hubConcepts}</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    {t.hubConceptsDesc}
                  </p>
                </div>
              </div>

              {nodes.length === 0 ? (
                <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400 text-sm space-y-2">
                  <p>{t.noConceptsFound}</p>
                  {(selectedCategory !== 'all' || searchQuery || minFrequency > 1) && (
                    <button
                      onClick={() => {
                        setSelectedCategory('all');
                        setSearchQuery('');
                        setMinFrequency(1);
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors"
                    >
                      {t.resetFilters}
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {nodes.slice(0, visibleHubsCount).map((node, rank) => {
                      const badge = getCategoryBadge(node.category, lang);
                      const Icon = badge.icon;
                      const isSelected = selectedNode?.id === node.id;
                      return (
                        <div
                          key={node.id}
                          onClick={() => handleNodeSelect(node)}
                          className={`p-3.5 rounded-2xl transition-all cursor-pointer group space-y-2.5 shadow-md border ${
                            isSelected
                              ? 'bg-slate-900 border-indigo-500 shadow-indigo-950/50'
                              : 'bg-slate-900/60 border-slate-800 hover:border-indigo-500/40 hover:bg-slate-900'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-bold text-slate-500">
                              #{rank + 1}
                            </span>
                            <div
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${badge.color}`}
                            >
                              <Icon size={10} />
                              <span>{badge.label}</span>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-1">
                              {node.name}
                            </h4>
                            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                              <span>
                                {node.count} {t.auditsLabel.toLowerCase()}
                              </span>
                              <span>•</span>
                              <span>
                                {node.degree} {t.connectionsCount.toLowerCase()}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                            <span className="text-slate-500">{t.transparencyLevel}</span>
                            <span
                              className="font-mono font-bold"
                              style={{ color: getTransparencyColor(node.avgTransparency) }}
                            >
                              {Math.round(node.avgTransparency)}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {nodes.length > visibleHubsCount && (
                    <div className="text-center pt-2">
                      <button
                        onClick={() => setVisibleHubsCount((prev) => prev + 12)}
                        className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-indigo-400 font-bold transition-colors shadow-sm"
                      >
                        {t.showMore} ({nodes.length - visibleHubsCount} restantes)
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Strongest Connections Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Layers size={18} className="text-cyan-400" />
                    <span>{t.strongestRelations}</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    {t.strongestRelationsDesc}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {topPairs.map((pair, idx) => (
                  <div
                    key={`${pair.source}-${pair.target}-${idx}`}
                    className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 hover:bg-slate-900 transition-all space-y-2 shadow-md"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        {t.coOccurrences}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono font-bold text-xs">
                        {pair.strength} {t.coincidencesCount}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-semibold text-white py-1">
                      <button
                        onClick={() => {
                          const target = nodes.find((n) => n.id === pair.source);
                          if (target) handleNodeSelect(target);
                          else handleJumpToTagHistory(pair.source);
                        }}
                        className="truncate hover:text-indigo-400 text-left transition-colors"
                        title={pair.source}
                      >
                        {pair.source}
                      </button>
                      <ArrowRight size={14} className="text-slate-500 flex-shrink-0" />
                      <button
                        onClick={() => {
                          const target = nodes.find((n) => n.id === pair.target);
                          if (target) handleNodeSelect(target);
                          else handleJumpToTagHistory(pair.target);
                        }}
                        className="truncate hover:text-indigo-400 text-left transition-colors"
                        title={pair.target}
                      >
                        {pair.target}
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
                      <span className="text-slate-500">{t.avgTransparency}</span>
                      <span
                        className="font-mono font-bold"
                        style={{ color: getTransparencyColor(pair.avgTransparency) }}
                      >
                        {Math.round(pair.avgTransparency)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RelatedTags3D;
