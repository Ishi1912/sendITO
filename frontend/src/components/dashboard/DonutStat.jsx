import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export default function DonutStat({ segments, total, size = 160 }) {
  const data = segments.filter((s) => s.value > 0);

  return (
    <div className="flex items-center gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data.length ? data : [{ label: "empty", value: 1, color: "#212446" }]}
              dataKey="value"
              nameKey="label"
              innerRadius="72%"
              outerRadius="100%"
              paddingAngle={data.length > 1 ? 3 : 0}
              stroke="none"
              isAnimationActive={false}
            >
              {(data.length ? data : [{ color: "#212446" }]).map((seg, i) => (
                <Cell key={i} fill={seg.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-2xl text-mist-100">{total}</span>
          <span className="text-[11px] text-mist-400">Total</span>
        </div>
      </div>

      <div className="flex-1 space-y-2.5 min-w-0">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-mist-100 capitalize truncate">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: seg.color }} />
              {seg.label}
            </span>
            <span className="flex items-center gap-2 shrink-0 font-mono text-mist-400">
              {seg.value}
              <span className="w-10 text-right">{total ? Math.round((seg.value / total) * 100) : 0}%</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
