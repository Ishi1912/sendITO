
import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Send as SendIcon,
  Pencil,
  Trash2,
  Mail,
  CalendarClock,
  XCircle,
  Paperclip,
  FileText,
  Image as ImageIcon
} from "lucide-react";

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
    minute: "2-digit"
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
      const [campRes, subsRes] = await Promise.all([
        campaignApi.get(id),
        subscriberApi.list()
      ]);

      setCampaign(campRes.data.data);

      setActiveSubscriberCount(
        (subsRes.data.data || []).filter(
          (s) => s.status === "active"
        ).length
      );

    } catch (err) {
      toast.error(
        err.response?.data?.message ||
        "Couldn't load this campaign."
      );
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

      toast.success("Campaign sending process completed.");

      setSendOpen(false);
      await load();

    } catch (err) {
      toast.error(
        err.response?.data?.message ||
        "Sending failed."
      );
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
      await load();

    } catch (err) {
      toast.error(
        err.response?.data?.message ||
        "Couldn't cancel this campaign."
      );
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
      toast.error(
        err.response?.data?.message ||
        "Couldn't delete this campaign."
      );

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
  const isSending = campaign.status === "sending";
  const isFailed = campaign.status === "failed";

  // Delivery statistics
  const successCount = campaign.successCount ?? 0;
  const failedCount = campaign.failedCount ?? 0;

  // Use attemptedCount from backend.
  // Fallback supports campaigns created before attemptedCount was added.
  const attemptedCount =
    campaign.attemptedCount ??
    (successCount + failedCount);

  const showDeliveryStats =
    isSent || isFailed || isSending;

  return (
    <AppLayout
      title={
        <Link
          to="/campaigns"
          className="inline-flex items-center gap-2 text-2xl"
        >
          <ArrowLeft size={20} className="text-mist-400" />
          Campaign
        </Link>
      }
      actions={
        <>
          {(isDraft || isScheduled) && (
            <Button
              variant="secondary"
              icon={Pencil}
              onClick={() => setEditOpen(true)}
            >
              Edit
            </Button>
          )}

          {isScheduled && (
            <>
              <Button
                variant="secondary"
                icon={CalendarClock}
                onClick={() => setScheduleOpen(true)}
              >
                Reschedule
              </Button>

              <Button
                variant="danger"
                icon={XCircle}
                onClick={() => setCancelOpen(true)}
              >
                Cancel
              </Button>
            </>
          )}

          {isDraft && (
            <Button
              variant="secondary"
              icon={CalendarClock}
              onClick={() => setScheduleOpen(true)}
            >
              Schedule
            </Button>
          )}

          <Button
            variant="danger"
            icon={Trash2}
            onClick={() => setDeleteOpen(true)}
          >
            Delete
          </Button>

          {(isDraft || isCancelled) && (
            <Button
              icon={SendIcon}
              onClick={() => setSendOpen(true)}
            >
              Send campaign
            </Button>
          )}
        </>
      }
    >
      <div className="grid gap-5 lg:grid-cols-3">

        {/* Campaign Content */}
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

          <h2 className="font-display text-xl font-semibold text-mist-100 mb-4">
            {campaign.subject}
          </h2>

          <div className="rounded-xl border border-ink-600 bg-ink-900/50 p-5">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-mist-100/90">
              {campaign.content}
            </p>
          </div>

          {/* Attachments */}
          {campaign.attachments?.length > 0 && (
            <div className="mt-5">

              <div className="mb-3 flex items-center gap-2">
                <Paperclip
                  size={15}
                  className="text-signal-violet"
                />

                <h3 className="text-sm font-semibold text-mist-100">
                  Attachments ({campaign.attachments.length})
                </h3>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">

                {campaign.attachments.map((attachment) => {
                  const storedName =
                    attachment.storedName ||
                    attachment.path?.split(/[\\/]/).pop();

                  const fileUrl = storedName
                    ? `/uploads/${encodeURIComponent(storedName)}`
                    : null;

                  const isImage =
                    attachment.mimetype?.startsWith("image/") ||
                    /\.(png|jpe?g|gif|webp|svg)$/i.test(
                      attachment.filename || ""
                    );

                  return (
                    <div
                      key={attachment._id || attachment.filename}
                      className="overflow-hidden rounded-xl border border-ink-600 bg-ink-900/50"
                    >

                      {isImage && fileUrl ? (
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="block bg-ink-950"
                        >
                          <img
                            src={fileUrl}
                            alt={attachment.filename}
                            loading="lazy"
                            className="h-44 w-full object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        </a>
                      ) : null}

                      <div className="flex items-center gap-3 p-3">

                        {isImage ? (
                          <ImageIcon
                            size={18}
                            className="shrink-0 text-signal-violet"
                          />
                        ) : (
                          <FileText
                            size={18}
                            className="shrink-0 text-signal-violet"
                          />
                        )}

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-mist-100">
                            {attachment.filename}
                          </p>

                          <p className="text-xs text-mist-400">
                            {attachment.size
                              ? `${(attachment.size / 1024).toFixed(1)} KB`
                              : "Attachment"}
                          </p>
                        </div>

                        {fileUrl && (
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-medium text-signal-violet hover:text-violet-300"
                          >
                            View
                          </a>
                        )}

                      </div>
                    </div>
                  );
                })}

              </div>
            </div>
          )}

        </Card>

        {/* Delivery Information */}
        <Card className="p-6">

          <div className="flex items-center gap-2 mb-4">
            <Mail
              size={16}
              className="text-signal-violet"
            />

            <h3 className="font-display font-semibold text-mist-100">
              Delivery
            </h3>
          </div>

          <dl className="space-y-3 text-sm">

            {/* Status */}
            <div className="flex justify-between gap-3">
              <dt className="text-mist-400">
                Status
              </dt>

              <dd className="text-mist-100 capitalize">
                {campaign.status}
              </dd>
            </div>

            {/* Scheduled Time */}
            {isScheduled && (
              <div className="flex justify-between gap-3">
                <dt className="text-mist-400">
                  Scheduled for
                </dt>

                <dd className="text-mist-100 text-right">
                  {formatDateTime(campaign.scheduledAt)}
                </dd>
              </div>
            )}

            {/* Sent Time */}
            <div className="flex justify-between gap-3">
              <dt className="text-mist-400">
                Sent at
              </dt>

              <dd className="text-mist-100 text-right">
                {campaign.sentAt
                  ? formatDateTime(campaign.sentAt)
                  : "Not sent"}
              </dd>
            </div>

            {/* Delivery Statistics */}
            {showDeliveryStats && (
              <>
                <div className="border-t border-ink-600 pt-3" />

                {/* Successful Sends */}
                <div className="flex justify-between gap-3">
                  <dt className="text-mist-400">
                    Successful sends
                  </dt>

                  <dd className="font-mono font-semibold text-emerald-400">
                    {successCount}
                  </dd>
                </div>

                {/* Failed Sends */}
                <div className="flex justify-between gap-3">
                  <dt className="text-mist-400">
                    Failed sends
                  </dt>

                  <dd className="font-mono font-semibold text-red-400">
                    {failedCount}
                  </dd>
                </div>

                {/* Total Attempts */}
                <div className="flex justify-between gap-3">
                  <dt className="text-mist-400">
                    Total attempts
                  </dt>

                  <dd className="font-mono font-semibold text-mist-100">
                    {attemptedCount}
                  </dd>
                </div>
              </>
            )}

            {/* Active Subscribers */}
            <div className="border-t border-ink-600 pt-3" />

            <div className="flex justify-between gap-3">
              <dt className="text-mist-400">
                Active subscribers
              </dt>

              <dd className="font-mono text-mist-100">
                {activeSubscriberCount}
              </dd>
            </div>

            {/* Created */}
            <div className="flex justify-between gap-3">
              <dt className="text-mist-400">
                Created
              </dt>

              <dd className="text-mist-100 text-right">
                {formatDateTime(campaign.createdAt)}
              </dd>
            </div>

          </dl>

          <p className="mt-5 text-xs leading-relaxed text-mist-400">
            Successful sends indicate emails accepted by the configured
            email service. They do not confirm inbox delivery. Email opens
            and clicks are not currently tracked.
          </p>

        </Card>
      </div>

      {/* Modals */}
      <CampaignFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        campaign={campaign}
        onSaved={load}
      />

      <ScheduleModal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        campaign={campaign}
        onScheduled={load}
      />

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
