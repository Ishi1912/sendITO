import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell, Send, Users } from "lucide-react";
import { subscriberApi, campaignApi } from "../../api/client";
import { buildActivityFeed } from "../../utils/activity";
import { formatRelativeTime } from "../../utils/objectId";
import { useAuth } from "../../context/AuthContext";

export default function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [subscribers, setSubscribers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    // Loaded once, lazily, purely to power the search box and the bell's
    // activity preview - each page still fetches its own copy for its own
    // display, this is just for the topbar widgets.
    Promise.all([subscriberApi.list(), campaignApi.list()])
      .then(([s, c]) => {
        setSubscribers(s.data.data || []);
        setCampaigns(c.data.data || []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  useEffect(() => {
    function onClickOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setSearchOpen(false);
        setBellOpen(false);
        setAvatarOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const results = useMemo(() => {
    if (query.trim().length < 1) return { subs: [], camps: [] };
    const q = query.toLowerCase();
    return {
      subs: subscribers.filter((s) => s.name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q)).slice(0, 4),
      camps: campaigns.filter((c) => c.subject?.toLowerCase().includes(q)).slice(0, 4),
    };
  }, [query, subscribers, campaigns]);

  const activity = useMemo(() => buildActivityFeed(subscribers, campaigns, 5), [subscribers, campaigns]);
  const hasRecentActivity = activity.length > 0 && Date.now() - activity[0].date.getTime() < 24 * 60 * 60 * 1000;

  return (
    <div ref={rootRef} className="flex items-center gap-3">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setSearchOpen(true)}
          placeholder="Search campaigns, subscribers…"
          className="w-64 rounded-lg border border-ink-500 bg-ink-800/80 py-2 pl-9 pr-3 text-sm text-mist-100 placeholder:text-mist-400 outline-none focus:border-signal-violet"
        />
        {searchOpen && query.trim() && (
          <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-ink-500 bg-ink-800 p-2 shadow-card z-40">
            {results.subs.length === 0 && results.camps.length === 0 ? (
              <p className="px-3 py-2 text-sm text-mist-400">No matches for "{query}"</p>
            ) : (
              <>
                {results.camps.length > 0 && (
                  <div className="mb-1">
                    <p className="px-3 py-1 text-[11px] uppercase tracking-wider text-mist-400">Campaigns</p>
                    {results.camps.map((c) => (
                      <button
                        key={c._id}
                        onClick={() => {
                          navigate(`/campaigns/${c._id}`);
                          setQuery("");
                          setSearchOpen(false);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-mist-100 hover:bg-ink-600"
                      >
                        <Send size={13} className="text-signal-violet shrink-0" />
                        <span className="truncate">{c.subject}</span>
                      </button>
                    ))}
                  </div>
                )}
                {results.subs.length > 0 && (
                  <div>
                    <p className="px-3 py-1 text-[11px] uppercase tracking-wider text-mist-400">Subscribers</p>
                    {results.subs.map((s) => (
                      <button
                        key={s._id}
                        onClick={() => {
                          navigate(`/subscribers`);
                          setQuery("");
                          setSearchOpen(false);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-mist-100 hover:bg-ink-600"
                      >
                        <Users size={13} className="text-signal-violet shrink-0" />
                        <span className="truncate">{s.name || s.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className="relative">
        <button
          onClick={() => setBellOpen((v) => !v)}
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-ink-500 bg-ink-800/80 text-mist-400 hover:text-mist-100 transition-colors"
          aria-label="Recent activity"
        >
          <Bell size={16} />
          {hasRecentActivity && (
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-status-coral" />
          )}
        </button>
        {bellOpen && (
          <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-ink-500 bg-ink-800 p-4 shadow-card z-40">
            <p className="mb-3 text-sm font-semibold text-mist-100">Recent activity</p>
            {activity.length === 0 ? (
              <p className="text-sm text-mist-400">Nothing yet.</p>
            ) : (
              <div className="space-y-3">
                {activity.map((e) => (
                  <div key={e.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-mist-100">{e.title}</span>
                    <span className="shrink-0 text-xs text-mist-400">{formatRelativeTime(e.date)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="relative">
        <button
          onClick={() => setAvatarOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-signal-violet text-sm font-semibold text-white uppercase"
        >
          {user?.email?.[0] || "?"}
        </button>
        {avatarOpen && (
          <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-ink-500 bg-ink-800 p-2 shadow-card z-40">
            <p className="truncate px-3 py-2 text-sm text-mist-100">{user?.email}</p>
            <button
              onClick={logout}
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-status-coral hover:bg-status-coral/10"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
