"use client";

import { useEffect, useRef } from "react";

export default function ParallaxLight() {
  const lightRef = useRef<HTMLDivElement>(null);
  const target = useRef({ x: 50, y: 50 });
  const current = useRef({ x: 50, y: 50 });
  const raf = useRef<number>(0);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      target.current = {
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      };
    };

    const animate = () => {
      current.current.x += (target.current.x - current.current.x) * 0.03;
      current.current.y += (target.current.y - current.current.y) * 0.03;

      if (lightRef.current) {
        lightRef.current.style.background = `radial-gradient(600px circle at ${current.current.x}% ${current.current.y}%, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 70%)`;
      }
      raf.current = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", onMove);
    raf.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  return <div ref={lightRef} className="parallax-light" />;
}
