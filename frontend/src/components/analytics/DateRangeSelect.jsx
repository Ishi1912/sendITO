import { useEffect, useRef, useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";

const OPTIONS = [
  { days: 7, label: "Last 7 days" },
  { days: 14, label: "Last 14 days" },
  { days: 30, label: "Last 30 days" },
];

function formatSpan(days) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  const fmt = (d) => d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}

export default function DateRangeSelect({ days, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = OPTIONS.find((o) => o.days === days) || OPTIONS[0];

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-ink-500 bg-ink-800/80 px-3.5 py-2 text-sm text-mist-100"
      >
        <Calendar size={14} className="text-mist-400" />
        {current.label} ({formatSpan(current.days)})
        <ChevronDown size={14} className="text-mist-400" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-ink-500 bg-ink-800 p-1.5 shadow-card z-30">
          {OPTIONS.map((o) => (
            <button
              key={o.days}
              onClick={() => {
                onChange(o.days);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                o.days === days ? "bg-signal-violet/15 text-signal-violet" : "text-mist-100 hover:bg-ink-600"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
