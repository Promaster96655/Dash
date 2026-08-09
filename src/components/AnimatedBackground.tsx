import React, { useEffect, useRef } from "react";

interface AnimatedBackgroundProps {
  theme: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
}

export default function AnimatedBackground({ theme }: AnimatedBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Map theme to hex colors for the canvas particle connections
  const getThemeColors = (t: string) => {
    switch (t) {
      case "indigo":
        return {
          primary: "79, 70, 229", // #4f46e5
          secondary: "129, 140, 248", // #818cf8
          glow: "rgba(30, 27, 75, 0.2)",
        };
      case "emerald":
        return {
          primary: "5, 150, 105", // #059669
          secondary: "52, 211, 153", // #34d399
          glow: "rgba(2, 44, 34, 0.2)",
        };
      case "rose":
        return {
          primary: "225, 29, 72", // #e11d48
          secondary: "251, 113, 133", // #fb7185
          glow: "rgba(76, 5, 25, 0.2)",
        };
      case "amber":
        return {
          primary: "217, 119, 6", // #d97706
          secondary: "251, 191, 36", // #fbbf24
          glow: "rgba(69, 26, 3, 0.2)",
        };
      case "purple":
      default:
        return {
          primary: "147, 51, 234", // #9333ea
          secondary: "192, 132, 252", // #c084fc
          glow: "rgba(46, 16, 101, 0.2)",
        };
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    const colors = getThemeColors(theme);

    // Initialize network particles matching the VPS cluster nodes concept
    const particles: Particle[] = [];
    const particleCount = Math.min(60, Math.floor((width * height) / 25000));

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 2 + 1,
        alpha: Math.random() * 0.5 + 0.2,
      });
    }

    let glowAngle = 0;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Draw glowing background radial gradient base
      const gradient = ctx.createRadialGradient(
        width / 2 + Math.cos(glowAngle) * 100,
        height / 2 + Math.sin(glowAngle) * 100,
        10,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.8
      );
      gradient.addColorStop(0, colors.glow);
      gradient.addColorStop(1, "rgba(10, 10, 10, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      glowAngle += 0.002;

      // 2. Draw modern dotted grid matching hypervisor monitoring dashboards
      ctx.fillStyle = "rgba(60, 60, 60, 0.04)";
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        for (let y = 0; y < height; y += gridSize) {
          ctx.fillRect(x, y, 1.5, 1.5);
        }
      }

      // 3. Move and draw nodes (particles)
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        // Boundaries check
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${colors.secondary}, ${p.alpha})`;
        ctx.shadowBlur = 4;
        ctx.shadowColor = `rgb(${colors.secondary})`;
        ctx.fill();
        ctx.shadowBlur = 0; // reset shadow
      });

      // 4. Draw connecting lines between close network nodes (cluster grid)
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const p1 = particles[i];
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 150) {
            const alpha = (1 - dist / 150) * 0.15;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(${colors.primary}, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none -z-10 bg-neutral-950"
    />
  );
}
