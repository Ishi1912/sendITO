import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Send,
  Radio,
  FileEdit,
  Plus,
  Upload,
  Sparkles,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import AppLayout from "../components/layout/AppLayout";
import StatCard from "../components/dashboard/StatCard";
import DonutStat from "../components/dashboard/DonutStat";
import ActivityFeed from "../components/dashboard/ActivityFeed";
import { Card, Badge, PageLoader, EmptyState } from "../components/ui/primitives";
import Button from "../components/ui/Button";
import { subscriberApi, campaignApi } from "../api/client";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { dateFromObjectId } from "../utils/objectId";
import { buildTrend } from "../utils/trend";
import { buildActivityFeed } from "../utils/activity";
import CampaignFormModal from "../components/campaigns/CampaignFormModal";
import SubscriberFormModal from "../components/subscribers/SubscriberFormModal";
import CsvImportModal from "../components/subscribers/CsvImportModal";

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-xs shadow-card">
      <p className="text-mist-400 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="font-mono" style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [subscribers, setSubscribers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [campaignFormOpen, setCampaignFormOpen] = useState(false);
  const [subscriberFormOpen, setSubscriberFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [subsRes, campsRes] = await Promise.all([subscriberApi.list(), campaignApi.list()]);
      setSubscribers(subsRes.data.data || []);
      setCampaigns(campsRes.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't load your dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeSubscribers = subscribers.filter((s) => s.status === "active");
  const liveCampaigns = campaigns.filter((c) => ["scheduled", "sending"].includes(c.status));
  const sentCampaigns = campaigns.filter((c) => c.status === "sent");

  const subTrend = useMemo(
    () => buildTrend(subscribers.map((s) => dateFromObjectId(s._id))),
    [subscribers]
  );
  const campTrend = useMemo(() => buildTrend(campaigns.map((c) => c.createdAt)), [campaigns]);
  const sentTrend = useMemo(() => buildTrend(sentCampaigns.map((c) => c.sentAt)), [sentCampaigns]);

  // Real "created vs sent" per day over the last 7 days - no fabricated
  // open/click numbers, since the backend doesn't track those.
  const performanceSeries = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
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
      const sent = campaigns.filter((c) => {
        if (!c.sentAt) return false;
        const t = new Date(c.sentAt);
        return t >= day && t < dayEnd;
      }).length;
      return {
        date: day.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        Created: created,
        Sent: sent,
      };
    });
  }, [campaigns]);

  const subscriberSegments = [
    { label: "Active", value: subscribers.filter((s) => s.status === "active").length, color: "#34D399" },
    { label: "Unsubscribed", value: subscribers.filter((s) => s.status === "unsubscribed").length, color: "#F5B84E" },
    { label: "Bounced", value: subscribers.filter((s) => s.status === "bounced").length, color: "#FF6859" },
  ];

  const recentCampaigns = [...campaigns]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  const activity = useMemo(() => buildActivityFeed(subscribers, campaigns, 6), [subscribers, campaigns]);

  if (loading) {
    return (
      <AppLayout title="Dashboard">
        <PageLoader />
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title={`Good morning${user?.email ? `, ${user.email.split("@")[0]}` : ""} 👋`}
      subtitle="Here's what's happening with your email campaigns today."
      actions={
        <Button icon={Plus} onClick={() => setCampaignFormOpen(true)}>
          New Campaign
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        <StatCard label="Total Subscribers" value={subscribers.length} icon={Users} accent="#8C6BFF" trend={subTrend} />
        <StatCard label="Live Campaigns" value={liveCampaigns.length} icon={Radio} accent="#34D399" hint="Scheduled or sending" />
        <StatCard label="Total Campaigns" value={campaigns.length} icon={FileEdit} accent="#5AA9FF" trend={campTrend} />
        <StatCard label="Sent" value={sentCampaigns.length} icon={Send} accent="#F5B84E" trend={sentTrend} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3 mb-6">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h3 className="font-display font-semibold text-mist-100">Campaign Performance</h3>
              <p className="text-sm text-mist-400 mt-0.5">Campaigns created vs. sent, last 7 days.</p>
            </div>
          </div>
          {campaigns.length === 0 ? (
            <EmptyState icon={Send} title="No campaigns yet" description="This chart fills in once you start creating campaigns." />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={performanceSeries} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#212446" />
                <XAxis dataKey="date" stroke="#9C9BC0" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#9C9BC0" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: "#9C9BC0" }} />
                <Line type="monotone" dataKey="Created" stroke="#8C6BFF" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Sent" stroke="#34D399" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
          <p className="mt-2 text-[11px] text-mist-400">
            Open and click tracking aren't captured by the current server, so only creation and send events are charted.
          </p>
        </Card>

        <Card className="p-6">
          <h3 className="font-display font-semibold text-mist-100 mb-1">Subscriber Health</h3>
          <p className="text-sm text-mist-400 mb-4">Current status of your list.</p>
          {subscribers.length === 0 ? (
            <EmptyState icon={Users} title="No subscribers yet" />
          ) : (
            <DonutStat segments={subscriberSegments} total={subscribers.length} />
          )}
          <Link to="/subscribers">
            <Button variant="secondary" size="sm" className="w-full mt-5">
              View all subscribers <ArrowRight size={13} />
            </Button>
          </Link>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3 mb-6">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-semibold text-mist-100">Recent Campaigns</h3>
              <p className="text-sm text-mist-400 mt-0.5">Your latest email campaigns.</p>
            </div>
            <Link to="/campaigns" className="text-sm font-medium text-signal-violet hover:underline flex items-center gap-1">
              View all <ArrowRight size={13} />
            </Link>
          </div>
          {recentCampaigns.length === 0 ? (
            <EmptyState
              icon={Send}
              title="No campaigns yet"
              description="Create your first campaign to see it appear here."
              action={
                <Button icon={Plus} onClick={() => setCampaignFormOpen(true)}>
                  New campaign
                </Button>
              }
            />
          ) : (
            <div className="divide-y divide-ink-600/60">
              {recentCampaigns.map((c) => (
                <Link
                  key={c._id}
                  to={`/campaigns/${c._id}`}
                  className="flex items-center justify-between gap-4 py-3.5 group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-mist-100 truncate group-hover:text-signal-violet transition-colors">
                      {c.subject}
                    </p>
                    <p className="text-xs text-mist-400 mt-0.5">
                      {c.sentAt
                        ? `Sent ${new Date(c.sentAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
                        : `Created ${new Date(c.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
                    </p>
                  </div>
                  <Badge status={c.status} />
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="font-display font-semibold text-mist-100 mb-1">Quick Actions</h3>
          <p className="text-sm text-mist-400 mb-4">Get started with your campaigns.</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setCampaignFormOpen(true)}
              className="flex flex-col gap-2 rounded-xl border border-ink-500 bg-ink-900/40 p-3.5 text-left hover:border-signal-violet/50 transition-colors"
            >
              <Plus size={16} className="text-signal-violet" />
              <span className="text-xs font-medium text-mist-100 leading-tight">New Campaign</span>
            </button>
            <button
              onClick={() => setSubscriberFormOpen(true)}
              className="flex flex-col gap-2 rounded-xl border border-ink-500 bg-ink-900/40 p-3.5 text-left hover:border-signal-violet/50 transition-colors"
            >
              <Users size={16} className="text-status-sky" />
              <span className="text-xs font-medium text-mist-100 leading-tight">Add Subscriber</span>
            </button>
            <button
              onClick={() => setImportOpen(true)}
              className="flex flex-col gap-2 rounded-xl border border-ink-500 bg-ink-900/40 p-3.5 text-left hover:border-signal-violet/50 transition-colors"
            >
              <Upload size={16} className="text-status-amber" />
              <span className="text-xs font-medium text-mist-100 leading-tight">Import CSV</span>
            </button>
            <Link
              to="/ai-assistant"
              className="flex flex-col gap-2 rounded-xl border border-ink-500 bg-ink-900/40 p-3.5 text-left hover:border-signal-violet/50 transition-colors"
            >
              <Sparkles size={16} className="text-signal-violet" />
              <span className="text-xs font-medium text-mist-100 leading-tight">Generate Email</span>
            </Link>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2 bg-gradient-to-br from-signal-violet/10 via-ink-700/60 to-ink-700/60 border-signal-violet/20">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-signal-violet/20">
                <Sparkles size={18} className="text-signal-violet" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-mist-100">AI Campaign Assistant</h3>
                <p className="text-sm text-mist-400">Create, improve, and analyze your email campaigns with AI.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link to="/ai-assistant">
                <Button icon={Sparkles} size="sm">
                  Generate Email
                </Button>
              </Link>
              <Link to="/spam-risk">
                <Button variant="secondary" icon={ShieldCheck} size="sm">
                  Check Spam Risk
                </Button>
              </Link>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-display font-semibold text-mist-100 mb-1">Activity Timeline</h3>
          <p className="text-sm text-mist-400 mb-4">Recent activity across your account.</p>
          <ActivityFeed events={activity} />
        </Card>
      </div>

      <CampaignFormModal open={campaignFormOpen} onClose={() => setCampaignFormOpen(false)} onSaved={load} />
      <SubscriberFormModal open={subscriberFormOpen} onClose={() => setSubscriberFormOpen(false)} onSaved={load} />
      <CsvImportModal open={importOpen} onClose={() => setImportOpen(false)} onImported={load} />
    </AppLayout>
  );
}
