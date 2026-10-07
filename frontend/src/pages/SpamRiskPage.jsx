import { useState } from "react";
import { ShieldCheck, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import AppLayout from "../components/layout/AppLayout";
import Button from "../components/ui/Button";
import { Card, EmptyState } from "../components/ui/primitives";
import { Field, Input, Textarea } from "../components/ui/Field";
import RadialScore from "../components/dashboard/RadialScore";
import { aiApi } from "../api/client";
import { useToast } from "../context/ToastContext";
import { computeRiskBreakdown, classifyIssueSeverity } from "../utils/spamBreakdown";

const RISK_COLOR = { Low: "#34D399", Medium: "#F5B84E", High: "#FB923C", Critical: "#FF6859" };
const RISK_COPY = {
  Low: "This email looks clean with minimal spam-like characteristics.",
  Medium: "Your email has some spam-like characteristics. Consider revising the flagged issues to improve deliverability.",
  High: "Several spam-like characteristics were found. Reviewing them before sending is strongly recommended.",
  Critical: "This email has strong spam-like characteristics and is at real risk of being filtered.",
};

const SEVERITY_COLOR = { High: "text-status-coral bg-status-coral/15", Medium: "text-status-amber bg-status-amber/15", Low: "text-mist-400 bg-ink-600" };

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-xs shadow-card">
      <p className="text-mist-400 mb-0.5">{label}</p>
      <p className="font-mono text-mist-100">{payload[0].value} pts</p>
    </div>
  );
}

export default function SpamRiskPage() {
  const toast = useToast();
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);
  const [checkedAt, setCheckedAt] = useState(null);

  async function handleCheck(e) {
    e.preventDefault();
    if (!subject.trim() || !content.trim()) {
      toast.error("Add both a subject and content to analyze.");
      return;
    }
    setChecking(true);
    try {
      const { data } = await aiApi.spamCheck(subject, content);
      setResult(data.data);
      setCheckedAt(new Date());
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't analyze this email.");
    } finally {
      setChecking(false);
    }
  }

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const imageCount = (content.match(/<img\b/gi) || []).length;
  const riskBreakdown = result ? computeRiskBreakdown(result.breakdown) : [];
  const riskColor = result ? RISK_COLOR[result.risk] || "#9C9BC0" : "#9C9BC0";

  return (
    <AppLayout
      title={
        <span className="flex items-center gap-2">
          <ShieldCheck className="text-signal-violet" size={22} /> Spam Risk Analyzer
        </span>
      }
      subtitle="Check your email for spam-like content and get AI-powered insights."
    >
      <div className="grid gap-5 lg:grid-cols-2 mb-5">
        <Card className="p-6">
          <h3 className="font-display font-semibold text-mist-100 mb-1">Email Content</h3>
          <p className="text-sm text-mist-400 mb-4">Paste your subject and content to analyze the spam risk.</p>
          <form onSubmit={handleCheck} className="space-y-4">
            <Field label="Subject">
              <Input
                required
                maxLength={100}
                placeholder="🔥 BUY NOW!!! FREE OFFER"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
              <p className="mt-1 text-right text-[11px] text-mist-400">{subject.length}/100</p>
            </Field>
            <Field label="Email Content">
              <Textarea
                required
                rows={7}
                maxLength={5000}
                placeholder="Hurry! Limited time offer!! Click here to claim your reward…"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              <p className="mt-1 text-right text-[11px] text-mist-400">{content.length}/5000</p>
            </Field>
            <Button type="submit" icon={ShieldCheck} loading={checking} className="w-full">
              Check Spam Risk
            </Button>
          </form>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-display font-semibold text-mist-100">Spam Risk Result</h3>
            {checkedAt && (
              <span className="text-xs text-mist-400">
                Last checked: {checkedAt.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </span>
            )}
          </div>
          {!result ? (
            <EmptyState icon={ShieldCheck} title="No analysis yet" description="Run a check to see the risk score and breakdown here." />
          ) : (
            <div className="mt-3">
              <div className="flex items-center gap-5">
                <RadialScore score={result.score} color={riskColor} size={120} />
                <div>
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium"
                    style={{ backgroundColor: `${riskColor}22`, color: riskColor }}
                  >
                    <AlertTriangle size={13} />
                    {result.risk} Risk
                  </span>
                  <p className="mt-2 text-sm text-mist-400 leading-relaxed">{RISK_COPY[result.risk]}</p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3 border-t border-ink-600 pt-4 text-xs">
                <div>
                  <p className="text-mist-400">Rule Score</p>
                  <p className="mt-1 font-mono text-mist-100">{result.ruleScore}/100</p>
                </div>
                <div>
                  <p className="text-mist-400">AI Score</p>
                  <p className="mt-1 font-mono text-mist-100">{result.aiAvailable ? `${result.aiScore}/100` : "Unavailable"}</p>
                </div>
                <div>
                  <p className="text-mist-400">AI Analysis</p>
                  <p className="mt-1 font-mono text-mist-100">{result.aiAvailable ? "Included" : "Not available"}</p>
                </div>
              </div>
              {!result.aiAvailable && (
                <p className="mt-3 flex items-start gap-1.5 text-[11px] text-mist-400 leading-relaxed">
                  <Info size={12} className="mt-0.5 shrink-0" />
                  The server's AI analysis didn't respond (check its GEMINI_API_KEY), so this score
                  is based on rule-based checks only.
                </p>
              )}
            </div>
          )}
        </Card>
      </div>

      {result && (
        <>
          <div className="grid gap-5 lg:grid-cols-2 mb-5">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-status-coral" />
                  <h3 className="font-display font-semibold text-mist-100">Detected Issues</h3>
                </div>
                <span className="rounded-full bg-status-coral/15 px-2.5 py-1 text-xs text-status-coral">
                  {result.issues.length} issue{result.issues.length === 1 ? "" : "s"}
                </span>
              </div>
              {result.issues.length === 0 ? (
                <p className="text-sm text-mist-400">No issues detected.</p>
              ) : (
                <div className="space-y-3">
                  {result.issues.map((issue, i) => {
                    const severity = classifyIssueSeverity(issue);
                    return (
                      <div key={i} className="flex items-start justify-between gap-3 border-b border-ink-600/60 last:border-0 pb-3 last:pb-0">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <AlertTriangle size={14} className="text-status-amber mt-0.5 shrink-0" />
                          <p className="text-sm text-mist-100 leading-relaxed">{issue}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${SEVERITY_COLOR[severity]}`}>
                          {severity}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-status-mint" />
                  <h3 className="font-display font-semibold text-mist-100">Suggestions</h3>
                </div>
                <span className="rounded-full bg-status-mint/15 px-2.5 py-1 text-xs text-status-mint">
                  {result.suggestions.length} suggestion{result.suggestions.length === 1 ? "" : "s"}
                </span>
              </div>
              {result.suggestions.length === 0 ? (
                <p className="text-sm text-mist-400">Nothing to suggest - looks good.</p>
              ) : (
                <div className="space-y-3">
                  {result.suggestions.map((s, i) => (
                    <div key={i} className="flex items-start gap-2.5 border-b border-ink-600/60 last:border-0 pb-3 last:pb-0">
                      <CheckCircle2 size={14} className="text-status-mint mt-0.5 shrink-0" />
                      <p className="text-sm text-mist-100 leading-relaxed">{s}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <Card className="p-6">
              <h3 className="font-display font-semibold text-mist-100 mb-4">Content Analysis</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-mist-400 text-xs">Word Count</p>
                  <p className="font-mono text-mist-100 text-lg mt-0.5">{wordCount}</p>
                </div>
                <div>
                  <p className="text-mist-400 text-xs">Links</p>
                  <p className="font-mono text-mist-100 text-lg mt-0.5">{result.breakdown.linkCount}</p>
                </div>
                <div>
                  <p className="text-mist-400 text-xs">Images</p>
                  <p className="font-mono text-mist-100 text-lg mt-0.5">{imageCount}</p>
                </div>
                <div>
                  <p className="text-mist-400 text-xs">Subject Length</p>
                  <p className="font-mono text-mist-100 text-lg mt-0.5">{subject.length} chars</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 lg:col-span-2">
              <h3 className="font-display font-semibold text-mist-100 mb-1">Risk Breakdown</h3>
              <p className="text-sm text-mist-400 mb-4">How the rule-based score was calculated.</p>
              {riskBreakdown.length === 0 ? (
                <p className="text-sm text-mist-400">No rule-based points were triggered.</p>
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={riskBreakdown} barSize={44}>
                    <CartesianGrid vertical={false} stroke="#212446" />
                    <XAxis dataKey="label" stroke="#9C9BC0" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#9C9BC0" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(140,107,255,0.06)" }} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {riskBreakdown.map((b) => (
                        <Cell key={b.label} fill={b.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          <p className="mt-5 flex items-start gap-1.5 text-xs text-mist-400 leading-relaxed">
            <Info size={13} className="mt-0.5 shrink-0" />
            This is a content-based spam risk estimate. It does not guarantee inbox placement or
            determine how Gmail, Outlook, or another email provider will classify the message.
          </p>
        </>
      )}
    </AppLayout>
  );
}
