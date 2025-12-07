import { useCallback } from 'react';
import confetti from 'canvas-confetti';

export interface ConfettiConfig {
  particleCount?: number;
  spread?: number;
  origin?: { x: number; y: number };
  colors?: string[];
  duration?: number;
}

/**
 * Confetti Hook
 * Triggers celebration confetti animations
 */
export function useConfetti() {
  const fire = useCallback((config?: ConfettiConfig) => {
    const {
      particleCount = 50,
      spread = 70,
      origin = { x: 0.5, y: 0.5 },
      colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
    } = config || {};

    confetti({
      particleCount,
      spread,
      origin,
      colors,
      ticks: 200,
      gravity: 1,
      decay: 0.94,
      startVelocity: 30,
    });
  }, []);

  const celebration = useCallback((milestone?: 'first' | 100 | 500) => {
    const config: ConfettiConfig = {};

    switch (milestone) {
      case 'first':
        config.particleCount = 50;
        config.spread = 60;
        break;
      case 100:
        config.particleCount = 100;
        config.spread = 80;
        break;
      case 500:
        config.particleCount = 150;
        config.spread = 100;
        break;
      default:
        config.particleCount = 50;
        config.spread = 70;
    }

    // Fire multiple bursts for milestones
    if (milestone === 100 || milestone === 500) {
      const count = milestone === 500 ? 5 : 3;
      const interval = setInterval(() => {
        fire(config);
      }, 200);

      setTimeout(() => {
        clearInterval(interval);
      }, 200 * count);
    } else {
      fire(config);
    }
  }, [fire]);

  const fireworks = useCallback(() => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function () {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);
  }, []);

  return {
    fire,
    celebration,
    fireworks,
  };
}
