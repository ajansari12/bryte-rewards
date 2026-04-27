'use client';

import { SVGProps } from 'react';

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'stroke'> {
  name: string;
  size?: number;
  stroke?: number;
}

const Icon = ({ name, size = 16, stroke = 1.8, ...rest }: IconProps) => {
  const s = { width: size, height: size, flexShrink: 0, ...rest.style };
  const p = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: stroke,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  const paths: Record<string, React.ReactNode> = {
    feed: <><path d={"M3 5h18M3 12h18M3 19h12"} {...p} /></>,
    sparkle: <><path d={"M12 3l1.6 4.8L18 9.5l-4.4 1.7L12 16l-1.6-4.8L6 9.5l4.4-1.7z"} {...p} /><path d={"M19 16l.7 2.1L22 19l-2.3.9L19 22l-.7-2.1L16 19l2.3-.9z"} {...p} /></>,
    trophy: <><path d={"M7 4h10v4a5 5 0 01-10 0V4z"} {...p} /><path d={"M7 6H4a3 3 0 003 3M17 6h3a3 3 0 01-3 3M9 15h6v4H9z"} {...p} /></>,
    gift: <><path d={"M4 11h16v9H4zM3 7h18v4H3zM12 7v13M8 7a2 2 0 010-4c2 0 4 4 4 4M16 7a2 2 0 000-4c-2 0-4 4-4 4"} {...p} /></>,
    badge: <><circle cx="12" cy="9" r="6" {...p} /><path d={"M8 14l-2 8 6-3 6 3-2-8"} {...p} /></>,
    users: <><circle cx="9" cy="8" r="3.5" {...p} /><path d={"M3 20c0-3 3-5 6-5s6 2 6 5M16 9a3 3 0 000-6M22 20c0-2-2-4-4-4.5"} {...p} /></>,
    chart: <><path d={"M3 3v18h18M7 14l4-4 3 3 5-6"} {...p} /></>,
    shield: <><path d={"M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6l8-3z"} {...p} /></>,
    bell: <><path d={"M6 16V10a6 6 0 0112 0v6l2 2H4l2-2zM10 20a2 2 0 004 0"} {...p} /></>,
    moon: <><path d={"M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z"} {...p} /></>,
    sun: <><circle cx="12" cy="12" r="4" {...p} /><path d={"M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"} {...p} /></>,
    search: <><circle cx="11" cy="11" r="7" {...p} /><path d={"M20 20l-4-4"} {...p} /></>,
    close: <><path d={"M6 6l12 12M18 6L6 18"} {...p} /></>,
    plus: <><path d={"M12 5v14M5 12h14"} {...p} /></>,
    check: <><path d={"M4 12l5 5L20 6"} {...p} /></>,
    arrow: <><path d={"M5 12h14M13 6l6 6-6 6"} {...p} /></>,
    up: <><path d={"M6 15l6-6 6 6"} {...p} /></>,
    down: <><path d={"M6 9l6 6 6-6"} {...p} /></>,
    settings: <><circle cx="12" cy="12" r="3" {...p} /><path d={"M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"} {...p} /></>,
    star: <><path d={"M12 3l2.6 6.3 6.4.5-4.9 4.3 1.5 6.4L12 17l-5.6 3.5 1.5-6.4L3 9.8l6.4-.5z"} {...p} /></>,
    pen: <><path d={"M4 20l4-1 11-11-3-3L5 16l-1 4z"} {...p} /></>,
    crown: <><path d={"M3 18h18M4 8l3 4 5-6 5 6 3-4v10H4V8z"} {...p} /></>,
    maple: <><path d={"M12 3l1.2 3.5L17 5l-2 4 4 1-3.5 2 1 4-4.5-2L12 21l-1-4L6.5 19l1-4L4 13l4-1-2-4 3.8 1.5z"} {...p} /></>,
    heart: <><path d={"M12 20s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0119 10c0 5.5-7 10-7 10z"} {...p} /></>,
    fire: <><path d={"M12 3c3 3 5 6 5 10a5 5 0 01-10 0c0-2 1-3 2-4 1 2 2 2 3 1-1-3-1-5 0-7z"} {...p} /></>,
    menu: <><path d={"M3 6h18M3 12h18M3 18h18"} {...p} /></>,
    caret: <><path d={"M8 10l4 4 4-4"} {...p} /></>,
    dollar: <><path d={"M12 2v20M17 6H9a3 3 0 000 6h6a3 3 0 010 6H6"} {...p} /></>,
  };
  return <svg viewBox="0 0 24 24" style={s}>{paths[name] || null}</svg>;
};

export { Icon };
export default Icon;
