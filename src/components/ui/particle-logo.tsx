"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { BUDDHI_LOGO_BASE64 } from "@/const/logo-base64";

interface Particle {
  originX: number;
  originY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
}

interface ParticleLogoProps {
  imageSrc?: string;
  className?: string;
  dispersionStrength?: number;
  interactionRadius?: number;
  returnSpeed?: number;
  damping?: number;
  density?: number;
}

const PRIMARY_PALETTE = [
  "#e05d38", // Core BuddhiAI Terracotta
  "#f28564", // Warm Coral
  "#eaab95", // Soft Peach
  "#f2ccbf", // Light Tint
  "#f97316", // Vibrant Accent
  "#fb923c", // Amber Glow
];

export function ParticleLogo({
  imageSrc = BUDDHI_LOGO_BASE64,
  className = "",
  dispersionStrength = 14,
  interactionRadius = 90,
  returnSpeed = 0.08,
  damping = 0.88,
  density = 4,
}: ParticleLogoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({
    x: -9999,
    y: -9999,
    active: false,
  });
  const animFrameIdRef = useRef<number | null>(null);

  // Initialize and sample particles from image
  const initParticles = useCallback(
    (targetWidth: number, targetHeight: number) => {
      const width = targetWidth > 50 ? targetWidth : 400;
      const height = targetHeight > 50 ? targetHeight : 400;

      const img = new Image();

      img.onload = () => {
        try {
          const offCanvas = document.createElement("canvas");
          const offCtx = offCanvas.getContext("2d", { willReadFrequently: true });
          if (!offCtx) return;

          // Padding to keep the avatar nicely framed inside the canvas
          const padding = Math.min(width, height) * 0.06;
          const availableWidth = width - padding * 2;
          const availableHeight = height - padding * 2;

          const imgRatio = (img.width || 1) / (img.height || 1);
          let drawWidth = availableWidth;
          let drawHeight = availableWidth / imgRatio;

          if (drawHeight > availableHeight) {
            drawHeight = availableHeight;
            drawWidth = availableHeight * imgRatio;
          }

          const offsetX = (width - drawWidth) / 2;
          const offsetY = (height - drawHeight) / 2;

          offCanvas.width = width;
          offCanvas.height = height;

          offCtx.clearRect(0, 0, width, height);
          offCtx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

          const imgData = offCtx.getImageData(0, 0, width, height).data;
          const newParticles: Particle[] = [];

          // Sample pixels on a density grid
          for (let y = 0; y < height; y += density) {
            for (let x = 0; x < width; x += density) {
              const index = (y * width + x) * 4;
              const alpha = imgData[index + 3];

              // Sample only visible pixels with high enough alpha
              if (alpha > 35) {
                const color =
                  PRIMARY_PALETTE[Math.floor(Math.random() * PRIMARY_PALETTE.length)];

                // Initial subtle offset that springs into formation
                const initialOffset = (Math.random() - 0.5) * 40;
                newParticles.push({
                  originX: x,
                  originY: y,
                  x: x + initialOffset,
                  y: y + initialOffset,
                  vx: (Math.random() - 0.5) * 2,
                  vy: (Math.random() - 0.5) * 2,
                  size: Math.random() * 1.2 + 1.3,
                  color,
                  alpha: (alpha / 255) * (Math.random() * 0.25 + 0.75),
                });
              }
            }
          }

          particlesRef.current = newParticles;
          setIsLoaded(true);
        } catch (e) {
          console.error("Error sampling particle image:", e);
        }
      };

      img.onerror = (e) => {
        console.error("Failed to load particle logo image:", e);
      };

      img.src = imageSrc || BUDDHI_LOGO_BASE64;

      if (img.complete && img.naturalWidth > 0) {
        // Trigger immediately if already loaded
        img.onload(new Event("load"));
      }
    },
    [imageSrc, density]
  );

  // Resize listener & Canvas setup
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let resizeTimeout: NodeJS.Timeout;

    const handleResize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      const width = rect.width > 50 ? rect.width : (container.clientWidth > 50 ? container.clientWidth : 400);
      const height = rect.height > 50 ? rect.height : (container.clientHeight > 50 ? container.clientHeight : 400);

      canvas.width = width * dpr;
      canvas.height = height * dpr;

      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      initParticles(width, height);
    };

    const observer = new ResizeObserver(() => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleResize, 100);
    });

    observer.observe(container);
    handleResize();

    return () => {
      observer.disconnect();
      clearTimeout(resizeTimeout);
    };
  }, [initParticles]);

  // Main Animation Loop with Spring Physics
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.015;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const particles = particlesRef.current;
      const mouse = mouseRef.current;
      const radiusSq = interactionRadius * interactionRadius;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Cursor repulsion force
        if (mouse.active) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < radiusSq && distSq > 0) {
            const dist = Math.sqrt(distSq);
            const force = (1 - dist / interactionRadius) * dispersionStrength;
            const angle = Math.atan2(dy, dx);
            p.vx += Math.cos(angle) * force;
            p.vy += Math.sin(angle) * force;
          }
        }

        // Idle micro-oscillation for breathing effect
        const idleWave = Math.sin(time + p.originX * 0.03 + p.originY * 0.03) * 0.2;

        // Spring return force towards origin
        const homeDx = p.originX - p.x;
        const homeDy = p.originY - p.y + idleWave;

        p.vx += homeDx * returnSpeed;
        p.vy += homeDy * returnSpeed;

        p.vx *= damping;
        p.vy *= damping;

        p.x += p.vx;
        p.y += p.vy;

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
      }

      ctx.restore();
      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [interactionRadius, dispersionStrength, returnSpeed, damping]);

  // Event Handlers for Mouse and Touch Interaction
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      active: true,
    };
  };

  const handleMouseEnter = () => {
    mouseRef.current.active = true;
  };

  const handleMouseLeave = () => {
    mouseRef.current = {
      x: -9999,
      y: -9999,
      active: false,
    };
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || e.touches.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    mouseRef.current = {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top,
      active: true,
    };
  };

  const handleTouchEnd = () => {
    mouseRef.current.active = false;
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`relative w-full aspect-square min-h-[350px] max-w-[460px] flex items-center justify-center select-none cursor-crosshair ${className}`}
    >
      {/* Ambient Radial Backlight Glow */}
      <div
        className="absolute inset-0 rounded-full blur-[80px] pointer-events-none transition-opacity duration-700 -z-10"
        style={{
          background:
            "radial-gradient(circle, rgba(224,93,56,0.25) 0%, rgba(224,93,56,0.08) 50%, transparent 75%)",
        }}
      />

      {/* Loading fallback indicator */}
      {!isLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-[#e05d38]/30 border-t-[#e05d38] animate-spin" />
        </div>
      )}

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
      />
    </div>
  );
}
export default ParticleLogo;
