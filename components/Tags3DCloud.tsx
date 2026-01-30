import React, { useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, OrbitControls, Float, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { AuditHistoryItem } from '../types';

interface Tags3DCloudProps {
  history: AuditHistoryItem[];
}

interface TagData {
  name: string;
  count: number;
}

const Tag = ({ text, count, position, onClick }: { text: string; count: number; position: [number, number, number]; onClick: (tag: string) => void }) => {
  const [hovered, setHovered] = useState(false);
  
  useFrame((state) => {
    // Optional: make tags face camera or bob slightly
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <Text
        position={position}
        fontSize={hovered ? 0.8 : 0.5}
        color={hovered ? "#60a5fa" : "#94a3b8"}
        anchorX="center"
        anchorY="middle"
        onPointerOver={() => { document.body.style.cursor = 'pointer'; setHovered(true); }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; setHovered(false); }}
        onClick={() => onClick(text)}
      >
        {`${text} (${count})`}
      </Text>
    </Float>
  );
};

const WordCloud = ({ tags, onTagClick }: { tags: TagData[]; onTagClick: (tag: string) => void }) => {
  // Spherical distribution
  const words = useMemo(() => {
    const sphericalPoints: { position: [number, number, number]; text: string; count: number }[] = [];
    const phi = Math.PI * (3 - Math.sqrt(5)); // golden angle

    for (let i = 0; i < tags.length; i++) {
      const y = 1 - (i / (tags.length - 1)) * 2; // y goes from 1 to -1
      const radius = Math.sqrt(1 - y * y); // radius at y
      const theta = phi * i; // golden angle increment

      const x = Math.cos(theta) * radius;
      const z = Math.sin(theta) * radius;

      const scale = 12; // Sphere radius
      sphericalPoints.push({
        position: [x * scale, y * scale, z * scale],
        text: tags[i].name,
        count: tags[i].count
      });
    }
    return sphericalPoints;
  }, [tags]);

  return (
    <group>
      {words.map((word, i) => (
        <Tag key={i} text={word.text} count={word.count} position={word.position} onClick={onTagClick} />
      ))}
    </group>
  );
};

const Tags3DCloud: React.FC<Tags3DCloudProps> = ({ history }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const uniqueTags = useMemo(() => {
    const tagCounts: Record<string, number> = {};
    
    history.forEach(item => {
      const tagsToProcess: string[] = [];
      
      const isTagValid = (tag: string) => {
        if (!tag) return false;
        if (tag === item.title) return false;
        if (tag.length < 2 || tag.length > 50) return false;
        if (tag.split(/\s+/).length > 5) return false; // More than 5 words is likely a sentence/title
        return true;
      };

      if (item.audit.banderas_rojas) {
        item.audit.banderas_rojas.forEach(tag => {
          if (isTagValid(tag)) {
            tagsToProcess.push(tag);
          }
        });
      }
      
      const tipologia = item.audit.tipologia;
      if (isTagValid(tipologia)) {
        tagsToProcess.push(tipologia);
      }
      
      const ca = item.audit.comunidad_autonoma;
      if (isTagValid(ca)) {
        tagsToProcess.push(ca);
      }

      // Count unique tags per document to avoid double counting if a tag is both tipologia and in flags? 
      // Actually, usually they are different. Let's just count occurrences.
      new Set(tagsToProcess).forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    return Object.entries(tagCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [history]);

  const filteredTags = useMemo(() => {
    return uniqueTags.filter(tag => 
      tag.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [uniqueTags, searchTerm]);

  const handleTagClick = (tag: string) => {
    navigate(`/history?tags=${encodeURIComponent(tag)}`);
  };

  if (uniqueTags.length === 0) {
     return (
        <div className="h-[600px] flex items-center justify-center text-slate-500">
            No hay suficientes datos para generar la nube de etiquetas 3D.
        </div>
     )
  }

  return (
    <div className="h-[80vh] w-full bg-slate-900/20 rounded-3xl border border-slate-800 overflow-hidden relative">
      <div className="absolute top-4 left-4 z-10 bg-slate-900/80 p-4 rounded-xl backdrop-blur-md border border-slate-700 w-64 space-y-4">
        <div>
          <h3 className="text-xl font-bold text-white mb-1">Universo de Opacidad</h3>
          <p className="text-xs text-slate-400">Navega por los conceptos detectados en el BOE</p>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
          <input 
            type="text" 
            placeholder="Filtrar etiquetas..." 
            className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 pl-9 pr-3 text-xs text-white focus:border-blue-500 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <p className="text-[10px] text-slate-500">
          Mostrando {filteredTags.length} de {uniqueTags.length} etiquetas
          <br/>
          Arrastra para rotar • Rueda para zoom
        </p>
      </div>
      
      <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 20], fov: 60 }}>
        <fog attach="fog" args={['#020617', 0, 40]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
        <WordCloud tags={filteredTags} onTagClick={handleTagClick} />
        
        <OrbitControls autoRotate={!searchTerm} autoRotateSpeed={0.5} enablePan={false} />
      </Canvas>
    </div>
  );
};

export default Tags3DCloud;
