import { useEffect, useState } from "react";
import { Sparkles, PenLine, Lightbulb, ShieldCheck, Wand2, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import Button from "../components/ui/Button";
import { Card, EmptyState } from "../components/ui/primitives";
import { Field, Input, Textarea, Select } from "../components/ui/Field";
import CampaignFormModal from "../components/campaigns/CampaignFormModal";
import { aiApi } from "../api/client";
import { useToast } from "../context/ToastContext";

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

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveToHistory(entry) {
  const history = [entry, ...loadHistory()].slice(0, 8);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  return history;
}

export default function AiAssistantPage() {
  const toast = useToast();
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("professional");
  const [audience, setAudience] = useState(AUDIENCES[0]);
  const [details, setDetails] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [saveModalOpen, setSaveModalOpen] = useState(false);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

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
      const prompt = `Campaign topic: ${topic}.\n${details ? `Additional details: ${details}.\n` : ""}Write in a ${tone} tone for this audience: ${audience}.`;
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
      setHistory(saveToHistory(entry));
      toast.success("Draft generated.");
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          "Generation failed. Check that the server's GEMINI_API_KEY is configured."
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
              <Button type="submit" icon={Wand2} loading={generating} className="w-full">
                Generate Email
              </Button>
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
            <p className="text-xs text-mist-400 mb-3">Stored locally in this browser only.</p>
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
        onSaved={() => toast.success("Saved as a new draft campaign.")}
      />
    </AppLayout>
  );
}
