import { UserPlus, Upload, FileEdit, Send, CalendarClock, XCircle } from "lucide-react";
import { formatRelativeTime } from "../../utils/objectId";
import { EmptyState } from "../ui/primitives";
import { Clock } from "lucide-react";

const META = {
  subscriber_added: { icon: UserPlus, color: "#34D399" },
  import: { icon: Upload, color: "#34D399" },
  campaign_draft: { icon: FileEdit, color: "#F5B84E" },
  campaign_sent: { icon: Send, color: "#5AA9FF" },
  campaign_scheduled: { icon: CalendarClock, color: "#8C6BFF" },
  campaign_cancelled: { icon: XCircle, color: "#FF6859" },
};

export default function ActivityFeed({ events }) {
  if (!events.length) {
    return (
      <EmptyState
        icon={Clock}
        title="No activity yet"
        description="Actions across subscribers and campaigns will show up here."
      />
    );
  }

  return (
    <div className="space-y-4">
      {events.map((e) => {
        const meta = META[e.type] || { icon: Clock, color: "#9C9BC0" };
        const Icon = meta.icon;
        return (
          <div key={e.id} className="flex items-start gap-3">
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full mt-0.5"
              style={{ backgroundColor: `${meta.color}22` }}
            >
              <Icon size={13} style={{ color: meta.color }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-mist-100 truncate">{e.title}</p>
              {e.subtitle && <p className="text-xs text-mist-400 truncate">{e.subtitle}</p>}
            </div>
            <span className="shrink-0 text-xs text-mist-400">{formatRelativeTime(e.date)}</span>
          </div>
        );
      })}
    </div>
  );
}
