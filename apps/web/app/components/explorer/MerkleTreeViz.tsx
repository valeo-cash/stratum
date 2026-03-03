"use client";

function mockHash() {
  const hex = "0123456789abcdef";
  let h = "0x";
  for (let i = 0; i < 64; i++) h += hex[Math.floor(Math.random() * 16)];
  return h;
}

function truncHash(h: string) {
  if (h.length <= 12) return h;
  return h.slice(0, 8) + "..." + h.slice(-4);
}

export default function MerkleTreeViz({ leafHash, rootHash }: { leafHash: string; rootHash: string }) {
  const W = 480;
  const H = 220;
  const levelH = H / 3.5;

  const nodes = [
    { x: W / 2, y: levelH * 0.7, hash: rootHash, highlight: true, label: "root" },
    { x: W * 0.3, y: levelH * 1.7, hash: mockHash(), highlight: true, label: "" },
    { x: W * 0.7, y: levelH * 1.7, hash: mockHash(), highlight: false, label: "" },
    { x: W * 0.15, y: levelH * 2.7, hash: leafHash, highlight: true, label: "leaf" },
    { x: W * 0.45, y: levelH * 2.7, hash: mockHash(), highlight: false, label: "" },
  ];

  const edges: [number, number][] = [[0, 1], [0, 2], [1, 3], [1, 4]];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[480px]">
      {edges.map(([from, to], i) => {
        const a = nodes[from];
        const b = nodes[to];
        const isPath = a.highlight && b.highlight;
        return (
          <line
            key={i}
            x1={a.x} y1={a.y + 12}
            x2={b.x} y2={b.y - 12}
            stroke={isPath ? "#003FFF" : "#E5E7EB"}
            strokeWidth={isPath ? 2 : 1}
          />
        );
      })}
      {nodes.map((p, i) => (
        <g key={i}>
          <rect
            x={p.x - 56} y={p.y - 12}
            width={112} height={24}
            fill={p.highlight ? "#EFF6FF" : "#FAFAFA"}
            stroke={p.highlight ? "#003FFF" : "#E5E7EB"}
            strokeWidth={p.highlight ? 1.5 : 1}
          />
          {p.label && (
            <text x={p.x + 62} y={p.y + 4} fontSize={9} fill={p.label === "leaf" ? "#003FFF" : "#9CA3AF"} fontFamily="monospace" fontWeight={p.label === "leaf" ? 600 : 400}>
              {p.label}
            </text>
          )}
          <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize={10} fill={p.highlight ? "#003FFF" : "#6B7280"} fontFamily="monospace">
            {truncHash(p.hash)}
          </text>
        </g>
      ))}
    </svg>
  );
}
