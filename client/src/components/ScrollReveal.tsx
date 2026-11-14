import { useEffect, useRef, useState, type ReactNode } from 'react';

export function ScrollReveal({ children, className = '', id }: { children: ReactNode; className?: string; id?: string }) {
  const element = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'off' || !('IntersectionObserver' in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -36px 0px' });
    if (element.current) observer.observe(element.current);
    return () => observer.disconnect();
  }, []);

  return <section ref={element} id={id} className={`scroll-reveal ${visible ? 'is-visible' : ''} ${className}`}>{children}</section>;
}
