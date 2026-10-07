import { Link } from "react-router-dom";
import { useState } from "react";
import { Send, CalendarClock, XCircle, Trash2, Pencil, ArrowRight } from "lucide-react";
import { Card, Badge } from "../ui/primitives";
import DropdownMenu from "../ui/DropdownMenu";
import ConfirmDialog from "../ui/ConfirmDialog";
import ScheduleModal from "./ScheduleModal";
import { campaignApi } from "../../api/client";
import { useToast } from "../../context/ToastContext";

function formatDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function CampaignCard({ campaign: c, activeSubscriberCount, onChanged }) {
  const toast = useToast();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const sentCount = c.status === "sent" ? activeSubscriberCount : 0;

  async function handleSend() {
    setBusy(true);
    try {
      await campaignApi.send(c._id);
      toast.success("Campaign sent.");
      onChanged();
    } catch (err) {
      toast.error(err.response?.data?.message || "Sending failed.");
    } finally {
      setBusy(false);
      setSendConfirmOpen(false);
    }
  }

  async function handleCancel() {
    setBusy(true);
    try {
      await campaignApi.cancel(c._id);
      toast.success("Campaign cancelled.");
      onChanged();
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't cancel this campaign.");
    } finally {
      setBusy(false);
      setCancelConfirmOpen(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      await campaignApi.remove(c._id);
      toast.success("Campaign deleted.");
      onChanged();
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't delete this campaign.");
    } finally {
      setBusy(false);
      setDeleteConfirmOpen(false);
    }
  }

  const menuItems = [];
  if (c.status === "draft") {
    menuItems.push({ label: "Send now", icon: Send, onClick: () => setSendConfirmOpen(true) });
    menuItems.push({ label: "Schedule", icon: CalendarClock, onClick: () => setScheduleOpen(true) });
  }
  if (c.status === "scheduled") {
    menuItems.push({ label: "Reschedule", icon: CalendarClock, onClick: () => setScheduleOpen(true) });
    menuItems.push({ label: "Cancel", icon: XCircle, onClick: () => setCancelConfirmOpen(true) });
  }
  menuItems.push({ label: "Delete", icon: Trash2, danger: true, onClick: () => setDeleteConfirmOpen(true) });

  return (
    <>
      <Card className="group flex h-full flex-col p-5 transition-colors hover:border-signal-violet/50">
        <Link to={`/campaigns/${c._id}`} className="flex-1 flex flex-col">
          <div className="flex items-start justify-between gap-2">
            <Badge status={c.status} />
          </div>
          <h3 className="mt-3 font-display font-semibold text-mist-100 leading-snug line-clamp-2">
            {c.subject}
          </h3>
          <p className="mt-1.5 flex-1 text-sm text-mist-400 line-clamp-2 leading-relaxed">{c.content}</p>
          <p className="mt-3 text-xs text-mist-400">
            {c.sentAt
              ? `Sent ${formatDate(c.sentAt)}`
              : c.status === "scheduled"
              ? `Scheduled ${formatDate(c.scheduledAt)}`
              : `Created ${formatDate(c.createdAt)}`}
          </p>

          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-ink-600 pt-3 text-xs">
            <div>
              <p className="font-mono text-mist-100">{sentCount}</p>
              <p className="text-mist-400">Sent</p>
            </div>
            <div>
              <p className="font-mono text-mist-400">—</p>
              <p className="text-mist-400">Delivery</p>
            </div>
            <div>
              <p className="font-mono text-mist-400">—</p>
              <p className="text-mist-400">Open rate</p>
            </div>
          </div>
        </Link>

        <div className="mt-4 flex items-center justify-between">
          <Link
            to={`/campaigns/${c._id}`}
            className="flex items-center gap-1 text-xs font-medium text-signal-violet hover:underline"
          >
            {c.status === "draft" ? (
              <>
                <Pencil size={12} /> Edit
              </>
            ) : (
              <>
                View details <ArrowRight size={12} />
              </>
            )}
          </Link>
          <DropdownMenu items={menuItems} />
        </div>
      </Card>

      <ScheduleModal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        campaign={c}
        onScheduled={onChanged}
      />
      <ConfirmDialog
        open={sendConfirmOpen}
        onClose={() => setSendConfirmOpen(false)}
        onConfirm={handleSend}
        loading={busy}
        confirmLabel="Send now"
        title="Send this campaign?"
        description="This emails every active subscriber on your list immediately. This can't be undone."
      />
      <ConfirmDialog
        open={cancelConfirmOpen}
        onClose={() => setCancelConfirmOpen(false)}
        onConfirm={handleCancel}
        loading={busy}
        confirmLabel="Cancel campaign"
        title="Cancel this scheduled campaign?"
        description="It won't be sent at its scheduled time. You can create a new campaign later if you change your mind."
      />
      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        loading={busy}
        title="Delete campaign"
        description={`This permanently deletes "${c.subject}". This can't be undone.`}
      />
    </>
  );
}
