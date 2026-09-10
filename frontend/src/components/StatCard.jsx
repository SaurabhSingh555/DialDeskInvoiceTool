import { useEffect, useState } from "react";

// Dashboard stat card with animated counter and gradient icon.
export default function StatCard({ title, value, Icon, gradient, suffix = "" }) {
  const numeric = typeof value === "number";
  const [display, setDisplay] = useState(numeric ? 0 : value);

  useEffect(() => {
    if (!numeric) {
      setDisplay(value);
      return;
    }
    let start = 0;
    const end = value;
    if (end === 0) {
      setDisplay(0);
      return;
    }
    const duration = 600;
    const startTime = performance.now();
    let raf;
    const tick = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      setDisplay(Math.floor(progress * (end - start) + start));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, numeric]);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {display}
            {suffix}
          </p>
        </div>
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl text-white ${gradient}`}
        >
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}
