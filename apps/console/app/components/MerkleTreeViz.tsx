"use client";

interface MerkleNode {
  hash: string;
  level: number;
  side: "left" | "right" | "root";
  highlight: boolean;
}

interface MerkleProof {
  leaf: string;
  nodes: MerkleNode[];
  root: string;
}

function truncHash(h: string) {
  if (h.length <= 12) return h;
  return h.slice(0, 8) + "..." + h.slice(-4);
}

export default function MerkleTreeViz({ proof }: { proof: MerkleProof }) {
  const W = 480;
  const H = 220;
  const levels = 3;
  const levelH = H / (levels + 0.5);

  const nodesByLevel: MerkleNode[][] = [[], [], []];
  for (const n of proof.nodes) {
    if (n.level < 3) nodesByLevel[n.level].push(n);
  }

  // Position nodes: root at top, leaves at bottom
  const positions: { x: number; y: number; hash: string; highlight: boolean }[] = [];

  // Level 2 = root (1 node)
  const root = proof.nodes.find((n) => n.side === "root");
  if (root) {
    positions.push({ x: W / 2, y: levelH * 0.7, hash: root.hash, highlight: true });
  }

  // Level 1 = intermediate (2 nodes)
  const level1 = proof.nodes.filter((n) => n.level === 1);
  level1.forEach((n, i) => {
    positions.push({
      x: W * 0.3 + i * W * 0.4,
      y: levelH * 1.7,
      hash: n.hash,
      highlight: n.highlight,
    });
  });

  // Level 0 = leaves (2 nodes)
  const level0 = proof.nodes.filter((n) => n.level === 0);
  level0.forEach((n, i) => {
    positions.push({
      x: W * 0.15 + i * W * 0.3,
      y: levelH * 2.7,
      hash: n.hash,
      highlight: n.highlight,
    });
  });

  // Edges: root -> level1, level1[0] -> level0
  const edges: [number, number][] = [];
  if (positions.length >= 3) {
    edges.push([0, 1]); // root -> left intermediate
    edges.push([0, 2]); // root -> right intermediate
  }
  if (positions.length >= 5) {
    edges.push([1, 3]); // left intermediate -> leaf
    edges.push([1, 4]); // left intermediate -> sibling
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[480px]">
      {edges.map(([from, to], i) => {
        const a = positions[from];
        const b = positions[to];
        if (!a || !b) return null;
        const isPath = a.highlight && b.highlight;
        return (
          <line
            key={i}
            x1={a.x}
            y1={a.y + 12}
            x2={b.x}
            y2={b.y - 12}
            stroke={isPath ? "#003FFF" : "#E5E7EB"}
            strokeWidth={isPath ? 2 : 1}
          />
        );
      })}

      {positions.map((p, i) => (
        <g key={i}>
          <rect
            x={p.x - 56}
            y={p.y - 12}
            width={112}
            height={24}
            rx={0}
            fill={p.highlight ? "#EFF6FF" : "#FAFAFA"}
            stroke={p.highlight ? "#003FFF" : "#E5E7EB"}
            strokeWidth={p.highlight ? 1.5 : 1}
          />
          {i === 0 && (
            <text
              x={p.x + 62}
              y={p.y + 4}
              fontSize={9}
              fill="#9CA3AF"
              fontFamily="monospace"
            >
              root
            </text>
          )}
          {i === 3 && (
            <text
              x={p.x + 62}
              y={p.y + 4}
              fontSize={9}
              fill="#003FFF"
              fontFamily="monospace"
              fontWeight={600}
            >
              leaf
            </text>
          )}
          <text
            x={p.x}
            y={p.y + 4}
            textAnchor="middle"
            fontSize={10}
            fill={p.highlight ? "#003FFF" : "#6B7280"}
            fontFamily="monospace"
          >
            {truncHash(p.hash)}
          </text>
        </g>
      ))}
    </svg>
  );
}
