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
      
      // Handle both old format (object) and new format (string)
      let sentimentValue = 0.5;
      let sentimentType = 'neutral';
      
      if (typeof sentiment === 'string') {
        sentimentType = sentiment;
        // Assign default intensity values for string format
        sentimentValue = sentimentType === 'positive' ? 0.7 : 
                        sentimentType === 'negative' ? 0.7 : 0.5;
      } else if (sentiment && typeof sentiment === 'object') {
        sentimentValue = sentiment.score || 0.5;
        sentimentType = sentiment.type || 'neutral';
      }
      
      // Determine particle colors based on sentiment
      let baseHue, saturation, lightness;
      
      if (sentimentType === 'positive') {
        // Blue tones for positive (matching the background)
        baseHue = 200 + sentimentValue * 20; // Blue range
        saturation = 70 + sentimentValue * 20;
        lightness = 60;
      } else if (sentimentType === 'negative') {
        // Warm/red tones for negative (matching the background)
        baseHue = 0 + sentimentValue * 30; // Red to orange range
        saturation = 80 + sentimentValue * 10;
        lightness = 55;
      } else {
        // Purple tones for neutral (matching the background)
        baseHue = 280; // Purple
        saturation = 60;
        lightness = 60;
      }

      // CRITICAL: Clear the canvas to make it transparent
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Optional: Add very subtle overlay for depth (mostly transparent)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.02)';
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
        
        // Draw particle trail with enhanced visibility
        const alpha = 0.7 + noiseVal * 0.3;
        const size = 2 + sentimentValue * 3;
        
        // Particle glow effect
        ctx.shadowBlur = 20 + sentimentValue * 15;
        ctx.shadowColor = `hsl(${baseHue}, ${saturation}%, ${lightness}%)`;
        
        // Draw main particle
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${baseHue + noiseVal * 40}, ${saturation + 20}%, ${lightness + 10}%, ${alpha * 0.6})`;
        ctx.fill();
        
        // Inner bright core
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, size * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${baseHue + 20}, 100%, 80%, ${alpha})`;
        ctx.fill();
        
        ctx.shadowBlur = 0;
      });

      // Draw flowing lines based on noise field (enhanced for visibility)
      if (keywords && keywords.length > 0) {
        ctx.strokeStyle = `hsla(${baseHue + 30}, 80%, 70%, 0.25)`;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = `hsl(${baseHue}, ${saturation}%, ${lightness}%)`;
        
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
        
        ctx.shadowBlur = 0;
      }

      // Add subtle energy bursts at random positions
      if (Math.random() < 0.02 && sentimentValue > 0.5) {
        const burstX = Math.random() * canvas.width;
        const burstY = Math.random() * canvas.height;
        const burstGradient = ctx.createRadialGradient(
          burstX, burstY, 0,
          burstX, burstY, 50
        );
        burstGradient.addColorStop(0, `hsla(${baseHue}, 100%, 70%, 0.4)`);
        burstGradient.addColorStop(1, `hsla(${baseHue}, 100%, 70%, 0)`);
        ctx.fillStyle = burstGradient;
        ctx.fillRect(burstX - 50, burstY - 50, 100, 100);
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
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
        background: 'transparent'
      }}
    />
  );
};

export default AuraVisualization;