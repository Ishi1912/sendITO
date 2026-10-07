import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Send as SendIcon, Pencil, Trash2, Mail, CalendarClock, XCircle } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import Button from "../components/ui/Button";
import { Card, Badge, PageLoader } from "../components/ui/primitives";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import CampaignFormModal from "../components/campaigns/CampaignFormModal";
import ScheduleModal from "../components/campaigns/ScheduleModal";
import { campaignApi, subscriberApi } from "../api/client";
import { useToast } from "../context/ToastContext";

function formatDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function CampaignDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [campaign, setCampaign] = useState(null);
  const [activeSubscriberCount, setActiveSubscriberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [campRes, subsRes] = await Promise.all([campaignApi.get(id), subscriberApi.list()]);
      setCampaign(campRes.data.data);
      setActiveSubscriberCount((subsRes.data.data || []).filter((s) => s.status === "active").length);
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't load this campaign.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSend() {
    setBusy(true);
    try {
      await campaignApi.send(id);
      toast.success("Campaign sent to your active subscribers.");
      setSendOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Sending failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    setBusy(true);
    try {
      await campaignApi.cancel(id);
      toast.success("Campaign cancelled.");
      setCancelOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't cancel this campaign.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      await campaignApi.remove(id);
      toast.success("Campaign deleted.");
      navigate("/campaigns");
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't delete this campaign.");
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <AppLayout title="Campaign">
        <PageLoader />
      </AppLayout>
    );
  }

  if (!campaign) return null;

  const isSent = campaign.status === "sent";
  const isScheduled = campaign.status === "scheduled";
  const isDraft = campaign.status === "draft";
  const isCancelled = campaign.status === "cancelled";

  return (
    <AppLayout
      title={
        <Link to="/campaigns" className="inline-flex items-center gap-2 text-2xl">
          <ArrowLeft size={20} className="text-mist-400" />
          Campaign
        </Link>
      }
      actions={
        <>
          {(isDraft || isScheduled) && (
            <Button variant="secondary" icon={Pencil} onClick={() => setEditOpen(true)}>
              Edit
            </Button>
          )}
          {isScheduled && (
            <>
              <Button variant="secondary" icon={CalendarClock} onClick={() => setScheduleOpen(true)}>
                Reschedule
              </Button>
              <Button variant="danger" icon={XCircle} onClick={() => setCancelOpen(true)}>
                Cancel
              </Button>
            </>
          )}
          {isDraft && (
            <Button variant="secondary" icon={CalendarClock} onClick={() => setScheduleOpen(true)}>
              Schedule
            </Button>
          )}
          <Button variant="danger" icon={Trash2} onClick={() => setDeleteOpen(true)}>
            Delete
          </Button>
          {(isDraft || isCancelled) && (
            <Button icon={SendIcon} onClick={() => setSendOpen(true)}>
              Send campaign
            </Button>
          )}
        </>
      }
    >
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <Badge status={campaign.status} />
            <span className="text-xs text-mist-400">
              {campaign.sentAt
                ? `Sent ${formatDateTime(campaign.sentAt)}`
                : campaign.scheduledAt && isScheduled
                ? `Scheduled for ${formatDateTime(campaign.scheduledAt)}`
                : `Created ${formatDateTime(campaign.createdAt)}`}
            </span>
          </div>
          <h2 className="font-display text-xl font-semibold text-mist-100 mb-4">{campaign.subject}</h2>
          <div className="rounded-xl border border-ink-600 bg-ink-900/50 p-5">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-mist-100/90">
              {campaign.content}
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Mail size={16} className="text-signal-violet" />
            <h3 className="font-display font-semibold text-mist-100">Delivery</h3>
          </div>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-mist-400">Status</dt>
              <dd className="text-mist-100 capitalize">{campaign.status}</dd>
            </div>
            {isScheduled && (
              <div className="flex justify-between">
                <dt className="text-mist-400">Scheduled for</dt>
                <dd className="text-mist-100">{formatDateTime(campaign.scheduledAt)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-mist-400">Sent at</dt>
              <dd className="text-mist-100">{campaign.sentAt ? formatDateTime(campaign.sentAt) : "Not sent"}</dd>
            </div>
            {isSent && (
              <div className="flex justify-between">
                <dt className="text-mist-400">Active subscribers now</dt>
                <dd className="text-mist-100 font-mono">{activeSubscriberCount}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-mist-400">Created</dt>
              <dd className="text-mist-100">{formatDateTime(campaign.createdAt)}</dd>
            </div>
          </dl>
          <p className="mt-5 text-xs leading-relaxed text-mist-400">
            {isSent
              ? "This was sent to every subscriber that was active at send time. The server doesn't record exactly how many that was or track delivery/open/click - the count above reflects your current active list, not a historical snapshot."
              : "Sending delivers to every subscriber with an active status at that moment. Per-recipient delivery, open, and click tracking isn't captured by the current server."}
          </p>
        </Card>
      </div>

      <CampaignFormModal open={editOpen} onClose={() => setEditOpen(false)} campaign={campaign} onSaved={load} />
      <ScheduleModal open={scheduleOpen} onClose={() => setScheduleOpen(false)} campaign={campaign} onScheduled={load} />

      <ConfirmDialog
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        onConfirm={handleSend}
        loading={busy}
        confirmLabel="Send now"
        title="Send this campaign?"
        description="This emails every active subscriber on your list immediately. This can't be undone."
      />
      <ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={handleCancel}
        loading={busy}
        confirmLabel="Cancel campaign"
        title="Cancel this scheduled campaign?"
        description="It won't be sent at its scheduled time."
      />
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={busy}
        title="Delete campaign"
        description={`This permanently deletes "${campaign.subject}". This can't be undone.`}
      />
    </AppLayout>
  );
}
