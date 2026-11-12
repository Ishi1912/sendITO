
import { useEffect, useRef, useState } from "react";
import { Paperclip, X, FileText } from "lucide-react";
import Modal from "../ui/Modal";
import { Field, Input, Textarea } from "../ui/Field";
import Button from "../ui/Button";
import AiComposePanel from "./AiComposePanel";
import { campaignApi, subscriberApi } from "../../api/client";
import { useToast } from "../../context/ToastContext";

const MAX_ATTACHMENTS = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Important: Keep this outside the component.
// This prevents a new empty array from being created on every render.
const EMPTY_ATTACHMENTS = Object.freeze([]);

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "";

  if (bytes < 1024) return `${bytes} B`;

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CampaignFormModal({
  open,
  onClose,
  onSaved,
  campaign,
  initialDraft,
  initialAttachments = EMPTY_ATTACHMENTS,
}) {
  const toast = useToast();

  const isEdit = Boolean(campaign?._id);

  const [form, setForm] = useState({
    subject: "",
    content: "",
  });

  const [saving, setSaving] = useState(false);
  const [subscribers, setSubscribers] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [removingId, setRemovingId] = useState(null);

  const fileInputRef = useRef(null);

  // Initialize campaign form when the modal opens.
  useEffect(() => {
    if (!open) return;

    setForm({
      subject: campaign?.subject || initialDraft?.subject || "",
      content: campaign?.content || initialDraft?.content || "",
    });

    setExistingAttachments(campaign?.attachments || []);

    // Carry files selected in AI Assistant into the campaign form.
    setPendingFiles(
      campaign?._id
        ? []
        : [...initialAttachments].slice(0, MAX_ATTACHMENTS)
    );

    subscriberApi
      .list()
      .then(({ data }) => {
        setSubscribers(data.data || []);
      })
      .catch(() => {
        setSubscribers([]);
      });
  }, [open, campaign, initialDraft, initialAttachments]);

  const totalAttachmentCount =
    existingAttachments.length + pendingFiles.length;

  // Handle attachment selection.
  function handlePickFiles(e) {
    const picked = Array.from(e.target.files || []);

    // Allow selecting the same file again later.
    e.target.value = "";

    const room = MAX_ATTACHMENTS - totalAttachmentCount;

    if (room <= 0) {
      toast.error(
        `You can attach up to ${MAX_ATTACHMENTS} files per campaign.`
      );
      return;
    }

    const tooBig = picked.filter(
      (file) => file.size > MAX_FILE_SIZE
    );

    const accepted = picked
      .filter((file) => file.size <= MAX_FILE_SIZE)
      .slice(0, room);

    if (tooBig.length > 0) {
      toast.error(
        `${tooBig.length === 1 ? "That file is" : "Some files are"} over the 10MB limit and ${
          tooBig.length === 1 ? "wasn't" : "weren't"
        } added.`
      );
    }

    if (picked.length > accepted.length + tooBig.length) {
      toast.error(
        `Only ${MAX_ATTACHMENTS} attachments are allowed per campaign.`
      );
    }

    setPendingFiles((prev) => [...prev, ...accepted]);
  }

  // Remove a newly selected attachment.
  function removePendingFile(index) {
    setPendingFiles((prev) =>
      prev.filter((_, i) => i !== index)
    );
  }

  // Remove an already uploaded attachment.
  async function removeExistingAttachment(attachmentId) {
    setRemovingId(attachmentId);

    try {
      await campaignApi.removeAttachment(
        campaign._id,
        attachmentId
      );

      setExistingAttachments((prev) =>
        prev.filter((attachment) => attachment._id !== attachmentId)
      );

      toast.success("Attachment removed.");
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          "Couldn't remove that attachment."
      );
    } finally {
      setRemovingId(null);
    }
  }

  // Save campaign and upload pending attachments.
  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.subject.trim() || !form.content.trim()) {
      toast.error("Please enter a subject and email content.");
      return;
    }

    setSaving(true);

    try {
      let campaignId = campaign?._id;

      if (isEdit) {
        await campaignApi.update(campaign._id, form);
      } else {
        const { data } = await campaignApi.create(form);
        campaignId = data.data._id;
      }

      if (pendingFiles.length > 0) {
        try {
          await campaignApi.uploadAttachments(
            campaignId,
            pendingFiles
          );
        } catch (attachErr) {
          toast.error(
            attachErr.response?.data?.message ||
              "Campaign saved, but the attachments failed to upload."
          );

          onSaved();
          onClose();
          return;
        }
      }

      toast.success(
        isEdit
          ? "Campaign updated."
          : "Campaign saved as a draft."
      );

      onSaved();
      onClose();
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          "Couldn't save this campaign."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit campaign" : "New campaign"}
      subtitle="Write it yourself, or let AI draft a starting point."
      width="max-w-2xl"
    >
      <div className="space-y-5">
        <AiComposePanel
          subscribers={subscribers}
          onGenerated={(data) => {
            setForm((prev) => ({
              subject: data.subject || prev.subject,
              content: data.content || prev.content,
            }));
          }}
        />

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Subject line">
            <Input
              required
              placeholder="Your autumn sale starts now"
              value={form.subject}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  subject: e.target.value,
                }))
              }
            />
          </Field>

          <Field label="Email content">
            <Textarea
              required
              rows={9}
              placeholder="Write your email, or generate a draft above…"
              value={form.content}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  content: e.target.value,
                }))
              }
            />
          </Field>

          <Field
            label="Attachments"
            hint={`Up to ${MAX_ATTACHMENTS} files, 10MB each. Sent as attachments on every email in this campaign.`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handlePickFiles}
            />

            <div className="space-y-2">
              {existingAttachments.map((attachment) => (
                <div
                  key={attachment._id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-ink-500 bg-ink-900/60 px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText
                      size={14}
                      className="shrink-0 text-mist-400"
                    />

                    <span className="truncate text-sm text-mist-100">
                      {attachment.filename}
                    </span>

                    <span className="shrink-0 text-xs text-mist-400">
                      {formatBytes(attachment.size)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      removeExistingAttachment(attachment._id)
                    }
                    disabled={removingId === attachment._id}
                    className="shrink-0 rounded-md p-1 text-mist-400 hover:bg-ink-600 hover:text-status-coral disabled:opacity-50"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}

              {pendingFiles.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-signal-violet/30 bg-signal-violet/[0.06] px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText
                      size={14}
                      className="shrink-0 text-signal-violet"
                    />

                    <span className="truncate text-sm text-mist-100">
                      {file.name}
                    </span>

                    <span className="shrink-0 text-xs text-mist-400">
                      {formatBytes(file.size)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => removePendingFile(index)}
                    className="shrink-0 rounded-md p-1 text-mist-400 hover:bg-ink-600 hover:text-status-coral"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}

              {totalAttachmentCount < MAX_ATTACHMENTS && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  icon={Paperclip}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Add file or image
                </Button>
              )}
            </div>
          </Field>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
            >
              Cancel
            </Button>

            <Button type="submit" loading={saving}>
              {isEdit ? "Save changes" : "Save as draft"}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
