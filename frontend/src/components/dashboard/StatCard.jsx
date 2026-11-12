import { Card } from "../ui/primitives";
import Sparkline from "./Sparkline";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

export default function StatCard({ label, value, icon: Icon, accent = "#8C6BFF", trend, hint }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {Icon && (
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${accent}22` }}
              >
                <Icon size={16} style={{ color: accent }} />
              </div>
            )}
            <p className="text-xs font-medium uppercase tracking-wider text-mist-400 truncate">{label}</p>
          </div>
          <p className="mt-2.5 font-mono text-3xl font-medium text-mist-100">{value}</p>

          {trend ? (
            <p
              className={`mt-1.5 flex items-center gap-1 text-xs ${
                trend.deltaPositive ? "text-status-mint" : "text-status-coral"
              }`}
            >
              {trend.deltaPositive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
              {trend.deltaLabel}
            </p>
          ) : (
            hint && <p className="mt-1.5 text-xs text-mist-400">{hint}</p>
          )}
        </div>
        {trend?.daily && <Sparkline data={trend.daily} color={accent} />}
      </div>
    </Card>
  );
}
