import { useEffect, useRef } from 'react';
import PerlinNoise from '../utils/perlinNoise';

const AuraVisualization = ({ sentiment, keywords }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const noiseRef = useRef(new PerlinNoise());
  const timeRef = useRef(0);
  const particlesRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Initialize particles
    const particleCount = 150;
    if (particlesRef.current.length === 0) {
      for (let i = 0; i < particleCount; i++) {
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: 0,
          vy: 0,
          life: Math.random()
        });
      }
    }

    const animate = () => {
      timeRef.current += 0.005;
      
      // Sentiment-based color palette
      const sentimentValue = sentiment?.score || 0;
      const sentimentType = sentiment?.type || 'neutral';
      
      let baseHue, saturation, lightness;
      
      if (sentimentType === 'positive') {
        baseHue = 180 + sentimentValue * 40; // Cyan to Green
        saturation = 70 + sentimentValue * 20;
        lightness = 50;
      } else if (sentimentType === 'negative') {
        baseHue = 0 + (1 - sentimentValue) * 40; // Red to Orange
        saturation = 80 + sentimentValue * 10;
        lightness = 45;
      } else {
        baseHue = 260; // Purple
        saturation = 50;
        lightness = 55;
      }

      // Create gradient background
      const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width * 0.7
      );
      gradient.addColorStop(0, `hsl(${baseHue}, ${saturation}%, ${lightness - 20}%)`);
      gradient.addColorStop(0.5, `hsl(${baseHue + 20}, ${saturation - 10}%, ${lightness - 30}%)`);
      gradient.addColorStop(1, `hsl(${baseHue - 20}, ${saturation - 20}%, ${lightness - 40}%)`);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add subtle overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const noise = noiseRef.current;
      const scale = 0.003;
      const energy = 1 + (sentimentValue * 2);

      // Update and draw particles
      particlesRef.current.forEach(particle => {
        const nx = particle.x * scale;
        const ny = particle.y * scale;
        const noiseVal = noise.noise(nx, ny, timeRef.current);
        
        const angle = noiseVal * Math.PI * 2 * energy;
        const speed = 0.5 + sentimentValue * 1.5;
        
        particle.vx = Math.cos(angle) * speed;
        particle.vy = Math.sin(angle) * speed;
        
        particle.x += particle.vx;
        particle.y += particle.vy;
        
        // Wrap around edges
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;
        
        // Draw particle trail
        const alpha = 0.6 + noiseVal * 0.4;
        const size = 2 + sentimentValue * 3;
        
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${baseHue + noiseVal * 60}, ${saturation + 20}%, ${lightness + 20}%, ${alpha * 0.4})`;
        ctx.fill();
        
        // Glow effect
        ctx.shadowBlur = 15 + sentimentValue * 10;
        ctx.shadowColor = `hsl(${baseHue}, ${saturation}%, ${lightness}%)`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, size * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${baseHue + 40}, 100%, 70%, ${alpha})`;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Draw flowing lines based on noise field
      if (keywords && keywords.length > 0) {
        ctx.strokeStyle = `hsla(${baseHue + 30}, 70%, 60%, 0.15)`;
        ctx.lineWidth = 2;
        
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          for (let x = 0; x < canvas.width; x += 10) {
            const y = canvas.height / 2 + 
              noise.noise(x * 0.002, timeRef.current + i, 0) * 200 * energy;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [sentiment, keywords]);

  return (
    <canvas
      ref={canvasRef}
      id="aura-canvas"
    />
  );
};

export default AuraVisualization;