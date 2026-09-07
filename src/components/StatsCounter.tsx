import React, { useEffect, useRef, useState } from 'react';

interface StatItem {
  number: number;
  suffix?: string;
  label: string;
}

interface Props {
  stats: StatItem[];
}

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

function AnimatedNumber({
  target,
  suffix,
  duration,
  run,
}: {
  target: number;
  suffix?: string;
  duration: number;
  run: boolean;
}) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const hasStarted = useRef(false);
  const reduceMotion =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  useEffect(() => {
    if (!run) return;
    if (reduceMotion) {
      setValue(target);
      return;
    }
    if (hasStarted.current) return;
    hasStarted.current = true;

    const animate = (time: number) => {
      if (!startTimeRef.current) startTimeRef.current = time;
      const elapsed = time - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      setValue(Math.round(easeOutQuart(progress) * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [run, target, duration, reduceMotion]);

  return (
    <span>
      {value}
      {suffix && <span className="align-super text-[0.6em] text-secondary">{suffix}</span>}
    </span>
  );
}

export default function StatsCounter({ stats }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -80px 0px', threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="flex flex-wrap justify-center gap-8 md:gap-12"
      aria-label="Studio statistics"
    >
      {stats.map((stat, i) => (
        <React.Fragment key={stat.label}>
          {i > 0 && (
            <div className="my-2 hidden w-px self-stretch bg-border md:block" aria-hidden="true" />
          )}
          <div className="text-center">
            <span className="block font-display text-[clamp(2.5rem,6vw,3.5rem)] leading-none font-normal text-primary">
              <AnimatedNumber
                target={stat.number}
                suffix={stat.suffix}
                duration={1800}
                run={visible}
              />
            </span>
            <span className="mt-2 block text-[0.62rem] tracking-eyebrow text-muted-foreground uppercase">
              {stat.label}
            </span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}
