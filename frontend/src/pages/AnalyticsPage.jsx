import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Send, Users, AlertTriangle, Plus, Upload, Sparkles } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import AppLayout from "../components/layout/AppLayout";
import StatCard from "../components/dashboard/StatCard";
import DonutStat from "../components/dashboard/DonutStat";
import ActivityFeed from "../components/dashboard/ActivityFeed";
import AiInsightsPanel from "../components/analytics/AiInsightsPanel";
import DateRangeSelect from "../components/analytics/DateRangeSelect";
import { Card, Badge, PageLoader, EmptyState } from "../components/ui/primitives";
import Button from "../components/ui/Button";
import { subscriberApi, campaignApi } from "../api/client";
import { useToast } from "../context/ToastContext";
import { dateFromObjectId } from "../utils/objectId";
import { buildTrend } from "../utils/trend";
import { buildActivityFeed } from "../utils/activity";
import { classifyCampaignType } from "../utils/campaignType";
import CampaignFormModal from "../components/campaigns/CampaignFormModal";
import SubscriberFormModal from "../components/subscribers/SubscriberFormModal";
import CsvImportModal from "../components/subscribers/CsvImportModal";

const STATUS_COLORS = { sent: "#34D399", draft: "#8C6BFF", scheduled: "#5AA9FF", cancelled: "#F5B84E", sending: "#5AA9FF", failed: "#FF6859" };
const TYPE_COLORS = { Newsletter: "#8C6BFF", Promotional: "#5AA9FF", Welcome: "#34D399", "Re-engagement": "#F5B84E", Other: "#EC4899" };

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-xs shadow-card">
      <p className="text-mist-400 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="font-mono" style={{ color: p.color || p.fill }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const toast = useToast();
  const [subscribers, setSubscribers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rangeDays, setRangeDays] = useState(7);
  const [campaignFormOpen, setCampaignFormOpen] = useState(false);
  const [subscriberFormOpen, setSubscriberFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [subsRes, campsRes] = await Promise.all([subscriberApi.list(), campaignApi.list()]);
        setSubscribers(subsRes.data.data || []);
        setCampaigns(campsRes.data.data || []);
      } catch (err) {
        toast.error(err.response?.data?.message || "Couldn't load analytics.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const active = subscribers.filter((s) => s.status === "active");
  const bounced = subscribers.filter((s) => s.status === "bounced");
  const sent = campaigns.filter((c) => c.status === "sent");

  const campaignTrend = useMemo(() => buildTrend(campaigns.map((c) => c.createdAt), rangeDays), [campaigns, rangeDays]);
  const sentTrend = useMemo(() => buildTrend(sent.map((c) => c.sentAt), rangeDays), [sent, rangeDays]);
  const activeTrend = useMemo(() => buildTrend(active.map((s) => dateFromObjectId(s._id)), rangeDays), [active, rangeDays]);
  const bouncedTrend = useMemo(() => buildTrend(bounced.map((s) => dateFromObjectId(s._id)), rangeDays), [bounced, rangeDays]);

  // "Campaign Performance": your backend never tracks opens/clicks, so this
  // shows the two events it actually records - created vs. sent - instead of
  // fabricating engagement numbers.
  const performanceSeries = useMemo(() => {
    const days = [];
    for (let i = rangeDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      days.push(d);
    }
    return days.map((day) => {
      const dayEnd = new Date(day);
      dayEnd.setDate(dayEnd.getDate() + 1);
      const created = campaigns.filter((c) => {
        const t = new Date(c.createdAt);
        return t >= day && t < dayEnd;
      }).length;
      const sentCount = campaigns.filter((c) => {
        if (!c.sentAt) return false;
        const t = new Date(c.sentAt);
        return t >= day && t < dayEnd;
      }).length;
      return {
        date: day.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        Created: created,
        Sent: sentCount,
      };
    });
  }, [campaigns, rangeDays]);

  const growthSeries = useMemo(() => {
    const days = [];
    for (let i = rangeDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      days.push(d);
    }
    return days.map((day, idx) => ({
      date: day.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      count: buildTrend(subscribers.map((s) => dateFromObjectId(s._id)), rangeDays).daily[idx],
    }));
  }, [subscribers, rangeDays]);

  const statusSegments = useMemo(() => {
    const byStatus = {};
    for (const c of campaigns) byStatus[c.status] = (byStatus[c.status] || 0) + 1;
    return Object.entries(byStatus).map(([status, value]) => ({
      label: status.charAt(0).toUpperCase() + status.slice(1),
      value,
      color: STATUS_COLORS[status] || "#9C9BC0",
    }));
  }, [campaigns]);

  const typeSegments = useMemo(() => {
    const byType = {};
    for (const c of campaigns) {
      const type = classifyCampaignType(c.subject, c.content);
      byType[type] = (byType[type] || 0) + 1;
    }
    return Object.entries(byType).map(([type, value]) => ({
      label: type,
      value,
      color: TYPE_COLORS[type] || "#9C9BC0",
    }));
  }, [campaigns]);

  const sentTimeline = useMemo(() => {
    const sortedSent = [...sent].sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt));
    let running = 0;
    return sortedSent.map((c) => {
      running += 1;
      return {
        date: new Date(c.sentAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        total: running,
      };
    });
  }, [sent]);

  const recentSent = [...sent].sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt)).slice(0, 4);
  const activity = useMemo(() => buildActivityFeed(subscribers, campaigns, 4), [subscribers, campaigns]);

  async function reload() {
    setLoading(true);
    try {
      const [subsRes, campsRes] = await Promise.all([subscriberApi.list(), campaignApi.list()]);
      setSubscribers(subsRes.data.data || []);
      setCampaigns(campsRes.data.data || []);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <AppLayout title="Analytics">
        <PageLoader />
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Analytics"
      subtitle="Track your campaign performance and audience health."
      headerExtra={<DateRangeSelect days={rangeDays} onChange={setRangeDays} />}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        <StatCard label="Total Campaigns" value={campaigns.length} icon={Mail} accent="#8C6BFF" trend={campaignTrend} />
        <StatCard label="Sent" value={sent.length} icon={Send} accent="#5AA9FF" trend={sentTrend} />
        <StatCard label="Active Subscribers" value={active.length} icon={Users} accent="#34D399" trend={activeTrend} />
        <StatCard label="Bounced" value={bounced.length} icon={AlertTriangle} accent="#FF6859" trend={bouncedTrend} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <Card className="p-6">
              <h3 className="font-display font-semibold text-mist-100 mb-1">Campaign Performance</h3>
              <p className="text-sm text-mist-400 mb-4">Campaigns created vs. sent.</p>
              {campaigns.length === 0 ? (
                <EmptyState icon={Send} title="No campaigns yet" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={performanceSeries} barGap={2}>
                    <CartesianGrid vertical={false} stroke="#212446" />
                    <XAxis dataKey="date" stroke="#9C9BC0" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#9C9BC0" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(140,107,255,0.06)" }} />
                    <Legend wrapperStyle={{ fontSize: 11, color: "#9C9BC0" }} />
                    <Bar dataKey="Created" fill="#8C6BFF" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Sent" fill="#5AA9FF" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
              <p className="mt-2 text-[11px] text-mist-400">Open/click tracking isn't captured by the server.</p>
            </Card>

            <Card className="p-6">
              <h3 className="font-display font-semibold text-mist-100 mb-1">Campaign Status</h3>
              <p className="text-sm text-mist-400 mb-4">Current status of all campaigns.</p>
              {campaigns.length === 0 ? (
                <EmptyState icon={Mail} title="No campaigns yet" />
              ) : (
                <DonutStat segments={statusSegments} total={campaigns.length} size={130} />
              )}
            </Card>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Card className="p-6">
              <h3 className="font-display font-semibold text-mist-100 mb-1">Campaign Type Distribution</h3>
              <p className="text-sm text-mist-400 mb-4">Estimated from subject/content keywords.</p>
              {campaigns.length === 0 ? (
                <EmptyState icon={Mail} title="No campaigns yet" />
              ) : (
                <DonutStat segments={typeSegments} total={campaigns.length} size={130} />
              )}
            </Card>

            <Card className="p-6">
              <h3 className="font-display font-semibold text-mist-100 mb-1">Subscriber Growth</h3>
              <p className="text-sm text-mist-400 mb-4">New subscribers over the selected range.</p>
              {subscribers.length === 0 ? (
                <EmptyState icon={Users} title="No subscribers yet" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={growthSeries}>
                    <CartesianGrid vertical={false} stroke="#212446" />
                    <XAxis dataKey="date" stroke="#9C9BC0" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#9C9BC0" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line type="monotone" dataKey="count" name="New subscribers" stroke="#8C6BFF" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Card className="p-6">
              <h3 className="font-display font-semibold text-mist-100 mb-1">Campaigns Sent Over Time</h3>
              <p className="text-sm text-mist-400 mb-4">Cumulative campaigns sent in your account.</p>
              {sentTimeline.length === 0 ? (
                <EmptyState icon={Send} title="Nothing sent yet" description="Send a campaign to start this timeline." />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={sentTimeline}>
                    <CartesianGrid vertical={false} stroke="#212446" />
                    <XAxis dataKey="date" stroke="#9C9BC0" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#9C9BC0" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line type="monotone" dataKey="total" name="Total sent" stroke="#8C6BFF" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-display font-semibold text-mist-100">Recently Sent Campaigns</h3>
              </div>
              <p className="text-sm text-mist-400 mb-4">Open/click rate isn't tracked, so this lists sends by recency.</p>
              {recentSent.length === 0 ? (
                <EmptyState icon={Send} title="Nothing sent yet" />
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ink-600 text-left text-xs uppercase tracking-wider text-mist-400">
                      <th className="pb-2 font-medium">Campaign</th>
                      <th className="pb-2 font-medium">Sent</th>
                      <th className="pb-2 font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSent.map((c) => (
                      <tr key={c._id} className="border-b border-ink-600/60 last:border-0">
                        <td className="py-2.5 pr-2 text-mist-100 truncate max-w-[140px]">{c.subject}</td>
                        <td className="py-2.5 text-mist-400 font-mono">{new Date(c.sentAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</td>
                        <td className="py-2.5 text-right">
                          <Badge status={c.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <Link to="/campaigns" className="mt-3 inline-block text-xs font-medium text-signal-violet hover:underline">
                View all campaigns →
              </Link>
            </Card>
          </div>
        </div>

        <div className="space-y-5">
          <AiInsightsPanel subscribers={subscribers} campaigns={campaigns} />

          <Card className="p-5">
            <h3 className="font-display font-semibold text-mist-100 mb-1 text-sm">Quick Actions</h3>
            <p className="text-xs text-mist-400 mb-3">Jump to your most used features.</p>
            <div className="grid grid-cols-2 gap-2.5">
              <Button size="sm" icon={Plus} onClick={() => setCampaignFormOpen(true)}>
                New Campaign
              </Button>
              <Button size="sm" variant="secondary" icon={Users} onClick={() => setSubscriberFormOpen(true)}>
                Add Subscriber
              </Button>
              <Button size="sm" variant="secondary" icon={Upload} onClick={() => setImportOpen(true)}>
                Import CSV
              </Button>
              <Link to="/ai-assistant">
                <Button size="sm" variant="secondary" icon={Sparkles} className="w-full">
                  Generate Email
                </Button>
              </Link>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold text-mist-100 text-sm">Recent Activity</h3>
              <Link to="/" className="text-xs font-medium text-signal-violet hover:underline">
                View all
              </Link>
            </div>
            <ActivityFeed events={activity} />
          </Card>
        </div>
      </div>

      <CampaignFormModal open={campaignFormOpen} onClose={() => setCampaignFormOpen(false)} onSaved={reload} />
      <SubscriberFormModal open={subscriberFormOpen} onClose={() => setSubscriberFormOpen(false)} onSaved={reload} />
      <CsvImportModal open={importOpen} onClose={() => setImportOpen(false)} onImported={reload} />
    </AppLayout>
  );
}
