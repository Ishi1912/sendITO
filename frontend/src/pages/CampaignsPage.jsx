import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Send as SendIcon, Sparkles, ShieldCheck, ArrowRight } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import Button from "../components/ui/Button";
import { Card, EmptyState, PageLoader, Badge } from "../components/ui/primitives";
import { Select } from "../components/ui/Field";
import DonutStat from "../components/dashboard/DonutStat";
import CampaignFormModal from "../components/campaigns/CampaignFormModal";
import CampaignCard from "../components/campaigns/CampaignCard";
import { campaignApi, subscriberApi } from "../api/client";
import { useToast } from "../context/ToastContext";

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "sent", label: "Sent" },
  { key: "draft", label: "Drafts" },
  { key: "scheduled", label: "Scheduled" },
  { key: "cancelled", label: "Cancelled" },
];

const STATUS_COLORS = {
  sent: "#34D399",
  draft: "#9C9BC0",
  scheduled: "#F5B84E",
  sending: "#5AA9FF",
  cancelled: "#FF6859",
  failed: "#FF6859",
};

export default function CampaignsPage() {
  const toast = useToast();
  const [campaigns, setCampaigns] = useState([]);
  const [activeSubscriberCount, setActiveSubscriberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [statusTab, setStatusTab] = useState("all");
  const [sort, setSort] = useState("latest");

  async function load() {
    setLoading(true);
    try {
      const [campsRes, subsRes] = await Promise.all([campaignApi.list(), subscriberApi.list()]);
      setCampaigns(campsRes.data.data || []);
      setActiveSubscriberCount((subsRes.data.data || []).filter((s) => s.status === "active").length);
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't load campaigns.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = useMemo(() => {
    const c = { all: campaigns.length };
    for (const tab of STATUS_TABS) {
      if (tab.key !== "all") c[tab.key] = campaigns.filter((camp) => camp.status === tab.key).length;
    }
    return c;
  }, [campaigns]);

  const visible = useMemo(() => {
    let list = statusTab === "all" ? campaigns : campaigns.filter((c) => c.status === statusTab);
    list = [...list].sort((a, b) =>
      sort === "latest"
        ? new Date(b.createdAt) - new Date(a.createdAt)
        : new Date(a.createdAt) - new Date(b.createdAt)
    );
    return list;
  }, [campaigns, statusTab, sort]);

  const statusSegments = STATUS_TABS.filter((t) => t.key !== "all" && counts[t.key] > 0).map((t) => ({
    label: t.label,
    value: counts[t.key],
    color: STATUS_COLORS[t.key],
  }));

  const recentCampaigns = [...campaigns]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  if (loading) {
    return (
      <AppLayout title="Campaigns">
        <PageLoader />
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Campaigns"
      subtitle="Create, manage, and track your email campaigns."
      actions={
        <Button icon={Plus} onClick={() => setFormOpen(true)}>
          New Campaign
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-mist-400">Total Campaigns</p>
          <p className="mt-2 font-mono text-3xl text-mist-100">{campaigns.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-mist-400">Sent</p>
          <p className="mt-2 font-mono text-3xl text-status-mint">{counts.sent || 0}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-mist-400">Drafts</p>
          <p className="mt-2 font-mono text-3xl text-mist-100">{counts.draft || 0}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-mist-400">Cancelled</p>
          <p className="mt-2 font-mono text-3xl text-status-coral">{counts.cancelled || 0}</p>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-4">
        <div className="lg:col-span-3 space-y-5">
          <Card className="p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setStatusTab(tab.key)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    statusTab === tab.key
                      ? "bg-signal-violet text-white"
                      : "text-mist-400 hover:bg-ink-600 hover:text-mist-100"
                  }`}
                >
                  {tab.label}
                  <span
                    className={`rounded-full px-1.5 text-xs ${
                      statusTab === tab.key ? "bg-white/20" : "bg-ink-600"
                    }`}
                  >
                    {counts[tab.key] || 0}
                  </span>
                </button>
              ))}
            </div>
            <Select value={sort} onChange={(e) => setSort(e.target.value)} className="w-40">
              <option value="latest">Sort by: Latest</option>
              <option value="oldest">Sort by: Oldest</option>
            </Select>
          </Card>

          {visible.length === 0 ? (
            <Card>
              <EmptyState
                icon={SendIcon}
                title={campaigns.length === 0 ? "No campaigns yet" : "No campaigns here"}
                description={
                  campaigns.length === 0
                    ? "Create a campaign, draft the copy yourself or with AI, then send it to your active subscribers."
                    : "Try a different status tab."
                }
                action={
                  campaigns.length === 0 && (
                    <Button icon={Plus} onClick={() => setFormOpen(true)}>
                      New campaign
                    </Button>
                  )
                }
              />
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {visible.map((c) => (
                <CampaignCard
                  key={c._id}
                  campaign={c}
                  activeSubscriberCount={activeSubscriberCount}
                  onChanged={load}
                />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <h3 className="font-display font-semibold text-mist-100 mb-1 text-sm">Campaign Status</h3>
            {campaigns.length === 0 ? (
              <p className="text-sm text-mist-400 mt-2">No campaigns yet.</p>
            ) : (
              <div className="mt-3">
                <DonutStat segments={statusSegments} total={campaigns.length} size={120} />
              </div>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold text-mist-100 text-sm">Recent Campaigns</h3>
              <Link to="#" onClick={(e) => { e.preventDefault(); setStatusTab("all"); }} className="text-xs font-medium text-signal-violet hover:underline flex items-center gap-1">
                View all <ArrowRight size={11} />
              </Link>
            </div>
            <div className="space-y-3">
              {recentCampaigns.map((c) => (
                <Link key={c._id} to={`/campaigns/${c._id}`} className="flex items-center justify-between gap-2 group">
                  <div className="min-w-0">
                    <p className="text-sm text-mist-100 truncate group-hover:text-signal-violet transition-colors">{c.subject}</p>
                  </div>
                  <Badge status={c.status} />
                </Link>
              ))}
            </div>
          </Card>

          <Card className="p-5 border-signal-violet/20 bg-signal-violet/[0.06]">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={15} className="text-signal-violet" />
              <p className="text-sm font-semibold text-mist-100">AI Campaign Assistant</p>
            </div>
            <p className="text-xs text-mist-400 leading-relaxed mb-3">
              Create, improve, and analyze your email campaigns with AI.
            </p>
            <div className="flex gap-2">
              <Link to="/ai-assistant" className="flex-1">
                <Button size="sm" icon={Sparkles} className="w-full">
                  Generate
                </Button>
              </Link>
              <Link to="/spam-risk" className="flex-1">
                <Button size="sm" variant="secondary" icon={ShieldCheck} className="w-full">
                  Spam Risk
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>

      <CampaignFormModal open={formOpen} onClose={() => setFormOpen(false)} onSaved={load} />
    </AppLayout>
  );
}
