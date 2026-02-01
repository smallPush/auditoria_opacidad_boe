import React, { useMemo, useState, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, OrbitControls, Sphere, Line, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useNavigate } from 'react-router-dom';
import { AuditHistoryItem } from '../types';
import { translations, Language } from '../translations';
import { Search } from 'lucide-react';

interface RelatedTags3DProps {
  history: AuditHistoryItem[];
  lang: Language;
}

interface Node {
  id: string;
  name: string;
  count: number;
  avgTransparency: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
}

interface Link {
  source: string;
  target: string;
  strength: number;
}

const getTransparencyColor = (transparency: number) => {
  // 0 -> Red, 50 -> Amber, 100 -> Green
  if (transparency <= 33) return "#ef4444"; // red-500
  if (transparency <= 66) return "#f59e0b"; // amber-500
  return "#10b981"; // emerald-500
};

const NodeMesh = ({ node, onClick, isDimmed }: { node: Node; onClick: (tag: string) => void; isDimmed: boolean }) => {
  const [hovered, setHovered] = useState(false);
  const size = Math.log(node.count + 1) * 0.2 + 0.3;
  
  const baseColor = new THREE.Color(getTransparencyColor(node.avgTransparency));
  const hoverColor = new THREE.Color("#ffffff");
  const dimmedOpacity = 0.1;
  const normalOpacity = 1;

  return (
    <group position={node.position}>
      <Sphere args={[size, 32, 32]} onClick={() => onClick(node.name)}
        onPointerOver={() => { document.body.style.cursor = 'pointer'; setHovered(true); }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; setHovered(false); }}>
        <meshPhysicalMaterial 
          color={hovered ? hoverColor : baseColor} 
          emissive={hovered ? hoverColor : baseColor}
          emissiveIntensity={hovered ? 0.8 : 0.3}
          metalness={0.6}
          roughness={0.1}
          clearcoat={1}
          transparent
          opacity={isDimmed ? dimmedOpacity : normalOpacity}
        />
      </Sphere>
      {!isDimmed && (
        <Text
          position={[0, size + 0.4, 0]}
          fontSize={Math.max(0.3, size * 0.6)}
          color="white"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.02}
          outlineColor="#0f172a"
        >
          {`${node.name} (${Math.round(node.avgTransparency)}%)`}
        </Text>
      )}
    </group>
  );
};

const LinkMesh = ({ start, end, strength, isDimmed }: { start: THREE.Vector3; end: THREE.Vector3; strength: number; isDimmed: boolean }) => {
  if (isDimmed) return null;
  return (
    <Line
      points={[start, end]}
      color="#64748b"
      lineWidth={Math.min(15, strength * 5)}
      transparent
      opacity={0.6}
    />
  );
};

const Graph = ({ nodes, links, onNodeClick, searchQuery }: { nodes: Node[]; links: Link[]; onNodeClick: (tag: string) => void; searchQuery: string }) => {
  useFrame(() => {
    // Repulsion
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeA = nodes[i];
        const nodeB = nodes[j];
        const diff = new THREE.Vector3().subVectors(nodeA.position, nodeB.position);
        const dist = diff.length();
        if (dist < 0.1) continue;
        const force = diff.normalize().multiplyScalar(5 / (dist * dist)); 
        nodeA.velocity.add(force.multiplyScalar(0.002));
        nodeB.velocity.sub(force.multiplyScalar(0.002));
      }
    }

    // Attraction
    links.forEach(link => {
      const nodeA = nodes.find(n => n.id === link.source);
      const nodeB = nodes.find(n => n.id === link.target);
      if (nodeA && nodeB) {
        const diff = new THREE.Vector3().subVectors(nodeB.position, nodeA.position);
        const dist = diff.length();
        const targetLen = 6;
        const force = diff.normalize().multiplyScalar((dist - targetLen) * 0.02);
        nodeA.velocity.add(force.multiplyScalar(0.005));
        nodeB.velocity.sub(force.multiplyScalar(0.005));
      }
    });

    // Physics Update
    nodes.forEach(node => {
      node.velocity.sub(node.position.clone().multiplyScalar(0.001));
      node.velocity.multiplyScalar(0.95);
      if (node.velocity.length() > 0.2) node.velocity.normalize().multiplyScalar(0.2);
      node.position.add(node.velocity);
    });
  });

  return (
    <group>
      {links.map((link, i) => {
        const start = nodes.find(n => n.id === link.source)?.position;
        const end = nodes.find(n => n.id === link.target)?.position;
        const sourceNode = nodes.find(n => n.id === link.source);
        const targetNode = nodes.find(n => n.id === link.target);

        if (start && end && sourceNode && targetNode) {
          const isDimmed = searchQuery !== '' && 
            (!sourceNode.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
             !targetNode.name.toLowerCase().includes(searchQuery.toLowerCase()));
             
          return <LinkMesh key={`link-${i}`} start={start} end={end} strength={link.strength} isDimmed={isDimmed} />;
        }
        return null;
      })}
      {nodes.map(node => {
        const isDimmed = searchQuery !== '' && !node.name.toLowerCase().includes(searchQuery.toLowerCase());
        return <NodeMesh key={node.id} node={node} onClick={onNodeClick} isDimmed={isDimmed} />;
      })}
    </group>
  );
};

const RelatedTags3D: React.FC<RelatedTags3DProps> = ({ history, lang }) => {
  const navigate = useNavigate();
  const t = translations[lang];
  const [searchQuery, setSearchQuery] = useState('');

  const { nodes, links } = useMemo(() => {
    const tagStats: Record<string, { count: number; totalTransparency: number }> = {};
    const coOccurrences: Record<string, number> = {};

    history.forEach(item => {
      const tags = new Set<string>();
      
      const isTagValid = (tag: string) => {
        if (!tag) return false;
        if (tag === item.title) return false;
        if (tag.length < 2 || tag.length > 50) return false;
        if (tag.split(/\s+/).length > 5) return false;
        return true;
      };

      if (item.audit.banderas_rojas) {
        item.audit.banderas_rojas.forEach(t => {
          if (isTagValid(t)) tags.add(t);
        });
      }
      
      if (isTagValid(item.audit.tipologia)) tags.add(item.audit.tipologia);
      if (isTagValid(item.audit.comunidad_autonoma)) tags.add(item.audit.comunidad_autonoma);

      const uniqueTags = Array.from(tags);
      
      uniqueTags.forEach(tag => {
        if (!tagStats[tag]) tagStats[tag] = { count: 0, totalTransparency: 0 };
        tagStats[tag].count += 1;
        tagStats[tag].totalTransparency += item.audit.nivel_transparencia;
      });

      for (let i = 0; i < uniqueTags.length; i++) {
        for (let j = i + 1; j < uniqueTags.length; j++) {
          const t1 = uniqueTags[i];
          const t2 = uniqueTags[j];
          const key = [t1, t2].sort().join('|');
          coOccurrences[key] = (coOccurrences[key] || 0) + 1;
        }
      }
    });

    const nodes: Node[] = Object.entries(tagStats)
      //.filter(([_, stats]) => stats.count > 1) // Allow all tags
      .map(([name, stats]) => ({
        id: name,
        name,
        count: stats.count,
        avgTransparency: stats.totalTransparency / stats.count,
        position: new THREE.Vector3((Math.random() - 0.5) * 15, (Math.random() - 0.5) * 15, (Math.random() - 0.5) * 15),
        velocity: new THREE.Vector3()
      }));

    const links: Link[] = Object.entries(coOccurrences)
      .map(([key, strength]) => {
        const [source, target] = key.split('|');
        return { source, target, strength };
      })
      .filter(l => nodes.find(n => n.id === l.source) && nodes.find(n => n.id === l.target));

    return { nodes, links };
  }, [history]);

  const handleNodeClick = (tag: string) => {
    navigate(`/history?tags=${encodeURIComponent(tag)}`);
  };

  if (nodes.length === 0) {
    return (
      <div className="h-[600px] flex items-center justify-center text-slate-500 bg-slate-900/20 rounded-3xl border border-slate-800">
        <p>{t.notEnoughDataNetwork}</p>
      </div>
    );
  }

  return (
    <div className="h-[80vh] w-full bg-slate-950 rounded-3xl border border-slate-800 overflow-hidden relative shadow-2xl">
      <div className="absolute top-4 left-4 z-10 space-y-4 max-w-xs pointer-events-none">
        <div className="bg-slate-900/80 p-4 rounded-xl backdrop-blur-md border border-slate-700 shadow-xl pointer-events-auto">
          <h3 className="text-xl font-bold text-white mb-1">{t.conceptNetworkTitle}</h3>
          <p className="text-xs text-slate-400 mb-3">{t.networkDescription}</p>
          
          <div className="space-y-2">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{t.transparencyLevelLegend}</p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                <span className="text-[9px] text-slate-400">{t.legendCritical}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span className="text-[9px] text-slate-400">{t.legendWarning}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="text-[9px] text-slate-400">{t.legendTransparent}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/80 p-2 rounded-xl backdrop-blur-md border border-slate-700 shadow-xl pointer-events-auto flex items-center gap-2">
          <Search className="text-slate-400 ml-2" size={16} />
          <input 
            type="text" 
            placeholder="Buscar concepto..." 
            className="bg-transparent border-none outline-none text-white text-sm w-full placeholder:text-slate-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Canvas camera={{ position: [0, 0, 35], fov: 50 }}>
        <fog attach="fog" args={['#020617', 10, 50]} />
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#ffffff" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />
        
        <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
        
        <OrbitControls autoRotate autoRotateSpeed={0.05} enableDamping dampingFactor={0.05} />
        <Graph nodes={nodes} links={links} onNodeClick={handleNodeClick} searchQuery={searchQuery} />
      </Canvas>
    </div>
  );
};

export default RelatedTags3D;
