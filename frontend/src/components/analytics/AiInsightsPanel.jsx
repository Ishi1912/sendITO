import { useState } from "react";
import { Sparkles, TrendingUp, Users, Lightbulb } from "lucide-react";
import { Card } from "../ui/primitives";
import Button from "../ui/Button";
import { aiApi } from "../../api/client";
import { useToast } from "../../context/ToastContext";

const ICONS = {
  "Campaign Performance": TrendingUp,
  "Subscriber Health": Users,
  Recommendation: Lightbulb,
};

function parseInsights(text) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const items = [];
  for (const line of lines) {
    const match = line.match(/^(Campaign Performance|Subscriber Health|Recommendation)\s*:\s*(.+)$/i);
    if (match) {
      const label = Object.keys(ICONS).find((k) => k.toLowerCase() === match[1].toLowerCase());
      items.push({ label, text: match[2] });
    }
  }
  // Fall back to showing the raw text as one block if the model didn't follow the format
  return items.length ? items : [{ label: null, text }];
}

export default function AiInsightsPanel({ subscribers, campaigns }) {
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const active = subscribers.filter((s) => s.status === "active").length;
      const bounced = subscribers.filter((s) => s.status === "bounced").length;
      const unsub = subscribers.filter((s) => s.status === "unsubscribed").length;
      const sent = campaigns.filter((c) => c.status === "sent").length;
      const draft = campaigns.filter((c) => c.status === "draft").length;
      const cancelled = campaigns.filter((c) => c.status === "cancelled").length;

      const prompt = `Act as an email marketing analyst reviewing this account's current data:
- Total subscribers: ${subscribers.length} (active: ${active}, unsubscribed: ${unsub}, bounced: ${bounced})
- Total campaigns: ${campaigns.length} (sent: ${sent}, draft: ${draft}, cancelled: ${cancelled})

Write exactly three short insights, one per line, in this exact format with no extra text:
Campaign Performance: <1-2 sentences>
Subscriber Health: <1-2 sentences>
Recommendation: <1-2 sentences>`;

      const { data } = await aiApi.generate(prompt);
      setItems(parseInsights(data.data.content || ""));
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          "Couldn't generate insights. Check that the server's GEMINI_API_KEY is configured."
      );
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Card className="p-5 border-signal-violet/20 bg-signal-violet/[0.05] flex flex-col">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={16} className="text-signal-violet" />
        <h3 className="font-display font-semibold text-mist-100 text-sm">AI Campaign Insights</h3>
      </div>
      <p className="text-xs text-mist-400 mb-4 leading-relaxed">
        {items ? "Based on your current account data." : "Generate a summary based on your recent campaign performance."}
      </p>

      {items && (
        <div className="space-y-4 mb-4 flex-1">
          {items.map((item, i) => {
            const Icon = ICONS[item.label] || Sparkles;
            return (
              <div key={i} className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-signal-violet/15 mt-0.5">
                  <Icon size={13} className="text-signal-violet" />
                </div>
                <div className="min-w-0">
                  {item.label && <p className="text-sm font-medium text-mist-100">{item.label}</p>}
                  <p className="text-xs text-mist-400 leading-relaxed mt-0.5">{item.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Button size="sm" loading={generating} onClick={handleGenerate} className="w-full">
        {items ? "Generate New Insights" : "Generate Insights"}
      </Button>
    </Card>
  );
}
