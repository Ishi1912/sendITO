import { useEffect, useMemo, useState } from "react";
import { Plus, Upload, Download, Search, Pencil, Trash2, Users, UserCheck, UserMinus, AlertTriangle } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import AppLayout from "../components/layout/AppLayout";
import Button from "../components/ui/Button";
import { Card, Badge, EmptyState, PageLoader } from "../components/ui/primitives";
import { Input, Select } from "../components/ui/Field";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import SubscriberFormModal from "../components/subscribers/SubscriberFormModal";
import CsvImportModal from "../components/subscribers/CsvImportModal";
import DonutStat from "../components/dashboard/DonutStat";
import ActivityFeed from "../components/dashboard/ActivityFeed";
import { subscriberApi } from "../api/client";
import { useToast } from "../context/ToastContext";
import { dateFromObjectId, formatShortDate } from "../utils/objectId";
import { buildTrend } from "../utils/trend";
import { buildActivityFeed } from "../utils/activity";
import { downloadCsv } from "../utils/csv";

const SAMPLE_CSV = "name,email\nAmara Chen,amara@example.com\nLiam Ortiz,liam@example.com\n";

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-xs shadow-card">
      <p className="text-mist-400 mb-0.5">{label}</p>
      <p className="font-mono text-mist-100">{payload[0].value} added</p>
    </div>
  );
}

export default function SubscribersPage() {
  const toast = useToast();
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [formOpen, setFormOpen] = useState(false);
  const [editingSubscriber, setEditingSubscriber] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data } = await subscriberApi.list();
      setSubscribers(data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't load subscribers.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    return subscribers.filter((s) => {
      const matchesSearch =
        !search ||
        s.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.email?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [subscribers, search, statusFilter]);

  const active = subscribers.filter((s) => s.status === "active");
  const unsubscribed = subscribers.filter((s) => s.status === "unsubscribed");
  const bounced = subscribers.filter((s) => s.status === "bounced");

  const growthTrend = useMemo(
    () => buildTrend(subscribers.map((s) => dateFromObjectId(s._id))),
    [subscribers]
  );

  const growthSeries = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      days.push(d);
    }
    return days.map((day, idx) => ({
      date: day.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      count: growthTrend.daily[idx],
    }));
  }, [growthTrend]);

  const activity = useMemo(() => buildActivityFeed(subscribers, [], 6), [subscribers]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await subscriberApi.remove(deleteTarget._id);
      toast.success("Subscriber removed.");
      setSubscribers((prev) => prev.filter((s) => s._id !== deleteTarget._id));
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't remove this subscriber.");
    } finally {
      setDeleting(false);
    }
  }

  function handleExport() {
    if (subscribers.length === 0) {
      toast.error("No subscribers to export yet.");
      return;
    }
    downloadCsv(
      "subscribers-export.csv",
      subscribers.map((s) => ({
        name: s.name || "",
        email: s.email,
        status: s.status,
        added_on: formatShortDate(dateFromObjectId(s._id)),
      })),
      ["name", "email", "status", "added_on"]
    );
  }

  function downloadTemplate() {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "subscribers-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppLayout
      title="Subscribers"
      subtitle="Manage your audience and keep track of your subscriber activity."
      actions={
        <>
          <Button variant="secondary" icon={Upload} onClick={() => setImportOpen(true)}>
            Import CSV
          </Button>
          <Button
            icon={Plus}
            onClick={() => {
              setEditingSubscriber(null);
              setFormOpen(true);
            }}
          >
            Add Subscriber
          </Button>
        </>
      }
    >
      {loading ? (
        <PageLoader />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <Users size={15} className="text-signal-violet" />
                <p className="text-xs font-medium uppercase tracking-wider text-mist-400">Total Subscribers</p>
              </div>
              <p className="font-mono text-3xl text-mist-100">{subscribers.length}</p>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <UserCheck size={15} className="text-status-mint" />
                <p className="text-xs font-medium uppercase tracking-wider text-mist-400">Active</p>
              </div>
              <p className="font-mono text-3xl text-mist-100">{active.length}</p>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <UserMinus size={15} className="text-status-amber" />
                <p className="text-xs font-medium uppercase tracking-wider text-mist-400">Unsubscribed</p>
              </div>
              <p className="font-mono text-3xl text-mist-100">{unsubscribed.length}</p>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={15} className="text-status-coral" />
                <p className="text-xs font-medium uppercase tracking-wider text-mist-400">Bounced</p>
              </div>
              <p className="font-mono text-3xl text-mist-100">{bounced.length}</p>
            </Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-2 mb-6">
            <Card className="p-6">
              <h3 className="font-display font-semibold text-mist-100 mb-1">Subscriber Health</h3>
              <p className="text-sm text-mist-400 mb-4">Current status of your subscriber list.</p>
              {subscribers.length === 0 ? (
                <EmptyState icon={Users} title="No subscribers yet" />
              ) : (
                <DonutStat
                  segments={[
                    { label: "Active", value: active.length, color: "#34D399" },
                    { label: "Unsubscribed", value: unsubscribed.length, color: "#F5B84E" },
                    { label: "Bounced", value: bounced.length, color: "#FF6859" },
                  ]}
                  total={subscribers.length}
                />
              )}
            </Card>
            <Card className="p-6">
              <h3 className="font-display font-semibold text-mist-100 mb-1">Subscriber Growth</h3>
              <p className="text-sm text-mist-400 mb-4">New subscribers over the last 7 days.</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={growthSeries} barSize={28}>
                  <CartesianGrid vertical={false} stroke="#212446" />
                  <XAxis dataKey="date" stroke="#9C9BC0" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9C9BC0" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(140,107,255,0.06)" }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#8C6BFF" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-4">
            <div className="lg:col-span-3 space-y-5">
              <Card className="p-4 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist-400" />
                  <Input
                    className="pl-9"
                    placeholder="Search by name or email…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="sm:w-48">
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="unsubscribed">Unsubscribed</option>
                  <option value="bounced">Bounced</option>
                </Select>
              </Card>

              <Card className="overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-ink-600">
                  <p className="text-sm text-mist-400">{filtered.length} of {subscribers.length} subscribers</p>
                </div>
                {filtered.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title={subscribers.length === 0 ? "No subscribers yet" : "No matches"}
                    description={
                      subscribers.length === 0
                        ? "Add someone manually or import a CSV of name and email columns to get your list started."
                        : "Try a different search term or status filter."
                    }
                    action={
                      subscribers.length === 0 && (
                        <Button icon={Plus} onClick={() => setFormOpen(true)}>
                          Add subscriber
                        </Button>
                      )
                    }
                  />
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-ink-600 text-left text-xs uppercase tracking-wider text-mist-400">
                        <th className="px-5 py-3.5 font-medium">Name</th>
                        <th className="px-5 py-3.5 font-medium">Email</th>
                        <th className="px-5 py-3.5 font-medium">Status</th>
                        <th className="px-5 py-3.5 font-medium">Added on</th>
                        <th className="px-5 py-3.5 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((s) => (
                        <tr key={s._id} className="border-b border-ink-600/60 last:border-0 hover:bg-ink-700/40">
                          <td className="px-5 py-3.5 text-mist-100 font-medium">{s.name || "—"}</td>
                          <td className="px-5 py-3.5 text-mist-400 font-mono text-[13px]">{s.email}</td>
                          <td className="px-5 py-3.5">
                            <Badge status={s.status} />
                          </td>
                          <td className="px-5 py-3.5 text-mist-400 text-xs">
                            {formatShortDate(dateFromObjectId(s._id))}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => {
                                  setEditingSubscriber(s);
                                  setFormOpen(true);
                                }}
                                className="rounded-lg p-2 text-mist-400 hover:bg-ink-600 hover:text-mist-100 transition-colors"
                                aria-label={`Edit ${s.name}`}
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(s)}
                                className="rounded-lg p-2 text-mist-400 hover:bg-status-coral/10 hover:text-status-coral transition-colors"
                                aria-label={`Delete ${s.name}`}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>
            </div>

            <div className="space-y-5">
              <Card className="p-5">
                <h3 className="font-display font-semibold text-mist-100 mb-1 text-sm">Quick Actions</h3>
                <div className="mt-3 space-y-2">
                  <Button variant="secondary" size="sm" icon={Plus} className="w-full justify-start" onClick={() => setFormOpen(true)}>
                    Add Subscriber
                  </Button>
                  <Button variant="secondary" size="sm" icon={Upload} className="w-full justify-start" onClick={() => setImportOpen(true)}>
                    Import CSV
                  </Button>
                  <Button variant="secondary" size="sm" icon={Download} className="w-full justify-start" onClick={handleExport}>
                    Export List
                  </Button>
                </div>
              </Card>

              <Card className="p-5">
                <p className="text-sm font-semibold text-mist-100">Subscriber CSV Template</p>
                <p className="mt-1 text-xs text-mist-400 leading-relaxed">
                  Download the template to import your subscribers easily. Needs exactly two
                  columns: <span className="font-mono text-mist-100">name</span>,{" "}
                  <span className="font-mono text-mist-100">email</span>.
                </p>
                <Button variant="secondary" size="sm" icon={Download} className="w-full mt-3" onClick={downloadTemplate}>
                  Download Template
                </Button>
              </Card>

              <Card className="p-5">
                <h3 className="font-display font-semibold text-mist-100 mb-1 text-sm">Recent Activity</h3>
                <div className="mt-3">
                  <ActivityFeed events={activity} />
                </div>
              </Card>
            </div>
          </div>
        </>
      )}

      <SubscriberFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        subscriber={editingSubscriber}
        onSaved={load}
      />
      <CsvImportModal open={importOpen} onClose={() => setImportOpen(false)} onImported={load} />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Remove subscriber"
        description={`This permanently removes ${deleteTarget?.name || "this subscriber"} (${deleteTarget?.email}) from your list.`}
      />
    </AppLayout>
  );
}
