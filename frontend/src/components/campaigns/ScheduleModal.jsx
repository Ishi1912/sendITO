import { useState } from "react";
import { CalendarClock } from "lucide-react";
import Modal from "../ui/Modal";
import { Field, Input } from "../ui/Field";
import Button from "../ui/Button";
import { campaignApi } from "../../api/client";
import { useToast } from "../../context/ToastContext";

function toLocalInputValue(date) {
  const d = date ? new Date(date) : new Date(Date.now() + 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ScheduleModal({ open, onClose, campaign, onScheduled }) {
  const toast = useToast();
  const isReschedule = campaign?.status === "scheduled";
  const [value, setValue] = useState(() => toLocalInputValue(campaign?.scheduledAt));
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const iso = new Date(value).toISOString();
    setSaving(true);
    try {
      if (isReschedule) {
        await campaignApi.reschedule(campaign._id, iso);
        toast.success("Campaign rescheduled.");
      } else {
        await campaignApi.schedule(campaign._id, iso);
        toast.success("Campaign scheduled.");
      }
      onScheduled();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't schedule this campaign.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isReschedule ? "Reschedule campaign" : "Schedule campaign"}
      subtitle="Pick a future date and time to send this campaign automatically."
      width="max-w-sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Send at">
          <Input
            type="datetime-local"
            required
            min={toLocalInputValue(new Date(Date.now() + 5 * 60 * 1000))}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </Field>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" icon={CalendarClock} loading={saving}>
            {isReschedule ? "Reschedule" : "Schedule"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
