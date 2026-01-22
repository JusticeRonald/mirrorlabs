import { useEffect, useRef, useState } from 'react';

interface UseScrollAnimationOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

/**
 * Hook for scroll-triggered animations using Intersection Observer
 *
 * @param options Configuration options for the animation
 * @returns Object containing ref to attach to element and isVisible state
 *
 * @example
 * const { ref, isVisible } = useScrollAnimation();
 * return (
 *   <div
 *     ref={ref}
 *     className={isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}
 *   >
 *     Content
 *   </div>
 * );
 */
export const useScrollAnimation = (options: UseScrollAnimationOptions = {}) => {
  const { threshold = 0.1, rootMargin = '0px 0px -100px 0px', triggerOnce = true } = options;
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (triggerOnce) observer.unobserve(element);
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce]);

  return { ref, isVisible };
};

/**
 * Hook for creating staggered animation delays for multiple elements
 *
 * @param count Number of elements to stagger
 * @param baseDelay Base delay in milliseconds between each element
 * @returns Array of style objects with animation delays
 *
 * @example
 * const staggerDelays = useStaggerAnimation(6, 100);
 * return items.map((item, index) => (
 *   <div
 *     key={index}
 *     style={staggerDelays[index].style}
 *     className="animate-fade-in-up"
 *   >
 *     {item}
 *   </div>
 * ));
 */
export const useStaggerAnimation = (count: number, baseDelay: number = 100) => {
  return Array.from({ length: count }, (_, index) => ({
    style: { animationDelay: `${index * baseDelay}ms` }
  }));
};

/**
 * Hook for animated counting from 0 to a target value
 *
 * @param target The target number to count to
 * @param isVisible Whether the animation should start
 * @param decimals Number of decimal places (default 0)
 * @param duration Animation duration in ms (default 1500)
 * @returns The current count value as a formatted string
 *
 * @example
 * const count = useCounterAnimation(200, isVisible);
 * return <span>{count}</span>;
 */
export const useCounterAnimation = (
  target: number,
  isVisible: boolean,
  decimals: number = 0,
  duration: number = 1500
): string => {
  const [count, setCount] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isVisible) {
      setCount(0);
      return;
    }

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }

      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
      // Easing function for smooth deceleration
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = easeOutQuart * target;

      setCount(currentValue);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      startTimeRef.current = null;
    };
  }, [isVisible, target, duration]);

  return count.toFixed(decimals);
};

/**
 * Hook for parallax scroll effects
 *
 * @param speed Parallax speed multiplier (0-1, where 1 is no parallax)
 * @returns Object containing ref and current transform value
 */
export const useParallax = (speed: number = 0.5) => {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!ref.current) return;

      const rect = ref.current.getBoundingClientRect();
      const scrolled = window.scrollY;
      const elementTop = rect.top + scrolled;
      const windowHeight = window.innerHeight;

      // Calculate parallax offset based on element position
      const relativeScroll = scrolled - elementTop + windowHeight;
      const parallaxOffset = relativeScroll * (1 - speed);

      setOffset(parallaxOffset);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial calculation

    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed]);

  return { ref, offset, style: { transform: `translateY(${offset * 0.1}px)` } };
};
