import { useEffect, useRef, useState } from "react";
import { Sparkles, PenLine, Lightbulb, ShieldCheck, Wand2, Mail, Upload, FileText, Image as ImageIcon, X } from "lucide-react";
import { Link } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import Button from "../components/ui/Button";
import { Card, EmptyState } from "../components/ui/primitives";
import { Field, Input, Textarea, Select } from "../components/ui/Field";
import CampaignFormModal from "../components/campaigns/CampaignFormModal";
import { aiApi } from "../api/client";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

const TONES = ["professional", "friendly", "persuasive", "casual", "urgent", "formal"];
const AUDIENCES = ["All subscribers", "Active subscribers only", "Re-engaging unsubscribed contacts"];

const TEMPLATES = [
  { key: "product_launch", label: "Product Launch", desc: "Announce new products or features.", brief: "Announce the launch of our new product, highlighting its key benefit and driving early sign-ups" },
  { key: "promo", label: "Promotional Offer", desc: "Share discounts and special offers.", brief: "Share a limited-time discount offer with subscribers and encourage them to redeem it soon" },
  { key: "newsletter", label: "Newsletter", desc: "Share updates and valuable content.", brief: "Share a roundup of recent updates and useful content with our subscribers" },
  { key: "welcome", label: "Welcome Series", desc: "Onboard new subscribers warmly.", brief: "Welcome a new subscriber to our community and set expectations for what they'll receive" },
  { key: "followup", label: "Follow Up", desc: "Re-engage inactive subscribers.", brief: "Re-engage subscribers who haven't opened recent emails, reminding them what they've missed" },
];

const QUICK_TIPS = [
  "Keep your subject line under 50 characters",
  "Use a friendly and personal tone",
  "Add a clear call to action (CTA)",
  "Avoid spam trigger words (FREE, Urgent, etc.)",
  "Personalize your emails for better engagement",
];

const HISTORY_KEY = "signal_ai_generation_history";

function getHistoryKey(user) {
  // AuthContext stores the logged-in user's decoded JWT id and email.
  // Prefer the stable user ID; use email as a fallback.
  const identity = user?.id || user?.email;

  // Do not share guest history between accounts.
  return identity
    ? `${HISTORY_KEY}_${encodeURIComponent(String(identity).toLowerCase())}`
    : `${HISTORY_KEY}_guest`;
}

function loadHistory(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveToHistory(entry, key) {
  const history = [entry, ...loadHistory(key)].slice(0, 8);
  localStorage.setItem(key, JSON.stringify(history));
  return history;
}

export default function AiAssistantPage() {
  const toast = useToast();
  const { user } = useAuth();
  const historyKey = getHistoryKey(user);
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("professional");
  const [audience, setAudience] = useState(AUDIENCES[0]);
  const [details, setDetails] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Load only the generation history belonging to the current account.
    setHistory(loadHistory(historyKey));

    // Avoid showing the previous account's selected draft after account switch.
    setResult(null);
  }, [historyKey]);

  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

  async function handlePickFiles(event) {
    const input = event.target;
    const picked = Array.from(input.files || []);
    const valid = [];
    for (const file of picked) {
      const extension = file.name.split(".").pop()?.toLowerCase();
      if (!ACCEPTED_TYPES.includes(file.type) && !["png", "jpg", "jpeg", "gif", "webp", "pdf", "doc", "docx"].includes(extension)) {
        toast.error(`${file.name}: file type not supported.`);
      } else if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name}: maximum file size is 10MB.`);
      } else if (uploadedFiles.some((item) => item.name === file.name && item.size === file.size) || valid.some((item) => item.name === file.name && item.size === file.size)) {
        toast.info(`${file.name} is already added.`);
      } else valid.push(file);
    }
    input.value = "";
    if (!valid.length) return;
    setUploading(true);
    try {
      const response = await aiApi.uploadFiles(valid);
      const uploaded = response.data.data || [];
      setUploadedFiles((current) => [...current, ...uploaded.map((item, index) => ({
        ...item,
        preview: (item.mimetype || valid[index]?.type || "").startsWith("image/") ? URL.createObjectURL(valid[index]) : null,
        originalFile: valid[index],
      }))]);
      toast.success(`${uploaded.length} file${uploaded.length === 1 ? "" : "s"} uploaded.`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't upload files. Check your server and try again.");
    } finally {
      setUploading(false);
    }
  }

  async function removeUploadedFile(index) {
    const target = uploadedFiles[index];
    if (!target) return;
    try {
      await aiApi.removeFile(target.storedName || target.id);
      if (target.preview) URL.revokeObjectURL(target.preview);
      setUploadedFiles((current) => current.filter((_, i) => i !== index));
      toast.success("File removed.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't remove that file.");
    }
  }

  function applyTemplate(t) {
    setTopic(t.label);
    setDetails(t.brief);
    toast.info(`Loaded the "${t.label}" starting point - tweak it, then generate.`);
  }

  async function handleGenerate(e) {
    e?.preventDefault();
    if (!topic.trim()) {
      toast.error("Give the campaign a topic first.");
      return;
    }
    setGenerating(true);
    try {
      const fileContext = uploadedFiles.length ? `\nUploaded reference files (use these as context where possible): ${uploadedFiles.map((f) => f.name).join(", ")}.` : "";
      const prompt = `Campaign topic: ${topic}.\n${details ? `Additional details: ${details}.\n` : ""}Write in a ${tone} tone for this audience: ${audience}.${fileContext}`;
      const { data } = await aiApi.generate(prompt);
      const entry = {
        id: Date.now(),
        subject: data.data.subject,
        content: data.data.content,
        tone,
        topic,
        createdAt: new Date().toISOString(),
      };
      setResult(entry);
      setHistory(saveToHistory(entry, historyKey));
      toast.success("Draft generated.");
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          "Generation failed. Check that the server's GROQ_API_KEY is configured."
      );
    } finally {
      setGenerating(false);
    }
  }

  return (
    <AppLayout
      title={
        <span className="flex items-center gap-2">
          <Sparkles className="text-signal-violet" size={22} /> AI Assistant
        </span>
      }
      subtitle="Create better emails, faster. Let AI help you write, improve, and optimize your campaigns."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        <Card className="p-4 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-signal-violet/15">
            <PenLine size={16} className="text-signal-violet" />
          </div>
          <div>
            <p className="text-sm font-medium text-mist-100">Generate Email</p>
            <p className="text-xs text-mist-400 mt-0.5">Draft a full email from a topic and tone.</p>
          </div>
        </Card>
        <Card className="p-4 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-status-amber/15">
            <Lightbulb size={16} className="text-status-amber" />
          </div>
          <div>
            <p className="text-sm font-medium text-mist-100">Templates</p>
            <p className="text-xs text-mist-400 mt-0.5">Start from a common campaign type below.</p>
          </div>
        </Card>
        <Card className="p-4 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-status-sky/15">
            <Mail size={16} className="text-status-sky" />
          </div>
          <div>
            <p className="text-sm font-medium text-mist-100">Save as Campaign</p>
            <p className="text-xs text-mist-400 mt-0.5">Turn any draft straight into a real campaign.</p>
          </div>
        </Card>
        <Link to="/spam-risk">
          <Card className="p-4 flex items-start gap-3 h-full hover:border-signal-violet/50 transition-colors">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-status-mint/15">
              <ShieldCheck size={16} className="text-status-mint" />
            </div>
            <div>
              <p className="text-sm font-medium text-mist-100">Check Spam Risk</p>
              <p className="text-xs text-mist-400 mt-0.5">Analyze content before sending.</p>
            </div>
          </Card>
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={16} className="text-signal-violet" />
              <h3 className="font-display font-semibold text-mist-100">Generate Email with AI</h3>
            </div>
            <form onSubmit={handleGenerate} className="space-y-4">
              <Field label="Campaign topic">
                <Input
                  required
                  placeholder="New product launch"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tone">
                  <Select value={tone} onChange={(e) => setTone(e.target.value)}>
                    {TONES.map((t) => (
                      <option key={t} value={t} className="capitalize">
                        {t}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Audience">
                  <Select value={audience} onChange={(e) => setAudience(e.target.value)}>
                    {AUDIENCES.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label="Additional details (optional)">
                <Textarea
                  rows={3}
                  maxLength={500}
                  placeholder="Introducing our new product with special early access for subscribers."
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                />
                <p className="mt-1 text-right text-[11px] text-mist-400">{details.length}/500</p>
              </Field>
              <div>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <label className="text-sm font-medium text-mist-200">Reference files (optional)</label>
                  <span className="text-xs text-mist-400">Images, PDF, DOC/DOCX · up to 10MB each</span>
                </div>
                <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={handlePickFiles} />
                <button type="button" disabled={uploading} onClick={() => fileInputRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-ink-500 bg-ink-900/50 px-4 py-5 text-sm text-mist-300 transition-colors hover:border-signal-violet/60 hover:text-mist-100">
                  <Upload size={17} className="text-signal-violet" /> {uploading ? "Uploading files…" : "Choose files to upload"}
                </button>
                {uploadedFiles.length > 0 && <div className="mt-3 space-y-2">
                  {uploadedFiles.map((file, index) => <div key={`${file.name}-${file.size}-${index}`} className="flex items-center gap-3 rounded-lg border border-ink-600 bg-ink-900/60 p-3">
                    {file.preview ? <img src={file.preview} alt={file.name} className="h-12 w-12 rounded-md border border-ink-500 object-cover" /> : <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-signal-violet/15 text-signal-violet">{(file.mimetype || file.type || "").startsWith("image/") ? <ImageIcon size={20} /> : <FileText size={20} />}</div>}
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-mist-100">{file.name}</p><p className="text-xs text-mist-400">{file.size < 1048576 ? `${(file.size / 1024).toFixed(1)} KB` : `${(file.size / 1048576).toFixed(1)} MB`}</p></div>
                    <button type="button" onClick={() => removeUploadedFile(index)} aria-label={`Remove ${file.name}`} className="rounded-md p-2 text-mist-400 hover:bg-ink-600 hover:text-status-coral"><X size={16} /></button>
                  </div>)}
                </div>}
                <p className="mt-2 text-[11px] leading-relaxed text-mist-400">Files are uploaded and stored with your project. Image previews are shown here; PDF/Word contents are not automatically extracted into the AI prompt yet.</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button type="submit" icon={Wand2} loading={generating} className="w-full">
                  Generate Email
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  icon={Mail}
                  className="w-full"
                  disabled={!result || generating}
                  onClick={() => setSaveModalOpen(true)}
                >
                  Save as Campaign
                </Button>
              </div>
            </form>
            <p className="mt-2 text-[11px] text-mist-400 leading-relaxed">
              Audience and tone are included in the prompt sent to the AI, but the server's own
              instructions default to a professional tone, so results may not always follow your
              tone choice exactly.
            </p>
          </Card>

          {result && (
            <Card className="p-6 border-signal-violet/20 bg-signal-violet/[0.05]">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-mist-100">Generated draft</p>
                <Button size="sm" icon={Mail} onClick={() => setSaveModalOpen(true)}>
                  Save as campaign
                </Button>
              </div>
              <p className="text-sm font-medium text-mist-100 mb-2">{result.subject}</p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-mist-100/90">{result.content}</p>
              {uploadedFiles.length > 0 && (
                <div className="mt-5 border-t border-ink-600 pt-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-mist-400">Attachments included with this campaign</p>
                  <div className="flex flex-wrap gap-3">
                    {uploadedFiles.map((file, index) => (
                      <div key={`${file.name}-${file.size}-${index}`} className="flex max-w-full items-center gap-3 rounded-lg border border-ink-600 bg-ink-900/60 p-3">
                        {file.preview ? (
                          <img src={file.preview} alt={file.name} className="h-16 w-16 rounded-md border border-ink-500 object-cover" />
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-signal-violet/15 text-signal-violet"><FileText size={20} /></div>
                        )}
                        <div className="min-w-0"><p className="max-w-48 truncate text-sm font-medium text-mist-100">{file.name}</p><p className="text-xs text-mist-400">{file.size < 1048576 ? `${(file.size / 1024).toFixed(1)} KB` : `${(file.size / 1048576).toFixed(1)} MB`}</p></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}

          <Card className="p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-display font-semibold text-mist-100">AI Email Templates</h3>
            </div>
            <p className="text-sm text-mist-400 mb-4">Choose a starting point and customize it for your campaign.</p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {TEMPLATES.map((t) => (
                <div key={t.key} className="rounded-xl border border-ink-500 bg-ink-900/40 p-4 flex flex-col">
                  <p className="text-sm font-medium text-mist-100">{t.label}</p>
                  <p className="mt-1 flex-1 text-xs text-mist-400 leading-relaxed">{t.desc}</p>
                  <Button size="sm" variant="secondary" className="w-full mt-3" onClick={() => applyTemplate(t)}>
                    Use Template
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <h3 className="font-display font-semibold text-mist-100 mb-1 text-sm">Recent Generations</h3>
            <p className="text-xs text-mist-400 mb-3">Stored locally in this browser for this account only.</p>
            {history.length === 0 ? (
              <EmptyState icon={Sparkles} title="Nothing yet" description="Your generated drafts will show up here." />
            ) : (
              <div className="space-y-3">
                {history.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => setResult(h)}
                    className="block w-full rounded-lg border border-ink-600 p-3 text-left hover:border-signal-violet/40 transition-colors"
                  >
                    <p className="text-sm font-medium text-mist-100 truncate">{h.subject}</p>
                    <p className="mt-1 text-xs text-mist-400 line-clamp-2">{h.content}</p>
                    <span className="mt-1.5 inline-block rounded-full bg-ink-600 px-2 py-0.5 text-[10px] capitalize text-mist-400">
                      {h.tone}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="font-display font-semibold text-mist-100 mb-3 text-sm">Quick Tips</h3>
            <ul className="space-y-2.5">
              {QUICK_TIPS.map((tip) => (
                <li key={tip} className="flex items-start gap-2 text-sm text-mist-400">
                  <Lightbulb size={13} className="text-status-amber mt-0.5 shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <CampaignFormModal
        open={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        initialDraft={result}
        initialAttachments={uploadedFiles.map((file) => file.originalFile).filter(Boolean)}
        onSaved={() => toast.success("Saved as a new draft campaign.")}
      />
    </AppLayout>
  );
}
