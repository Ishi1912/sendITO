import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, Send, BarChart3, LogOut, Sparkles, ShieldCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import senditoMark from "../../assets/sendito-mark.png";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/subscribers", label: "Subscribers", icon: Users },
  { to: "/campaigns", label: "Campaigns", icon: Send },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
];

const toolItems = [
  { to: "/ai-assistant", label: "AI Assistant", icon: Sparkles },
  { to: "/spam-risk", label: "Spam Risk Analyzer", icon: ShieldCheck },
];

function NavItem({ to, label, icon: Icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
          isActive
            ? "bg-signal-violet/15 text-signal-violet"
            : "text-mist-400 hover:bg-ink-700 hover:text-mist-100"
        }`
      }
    >
      <Icon size={17} />
      {label}
    </NavLink>
  );
}

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-ink-600 bg-ink-800/80 backdrop-blur-sm">
      <div className="flex items-center gap-2.5 px-6 py-6">
        <img src={senditoMark} alt="" className="h-8 w-auto" />
        <div className="leading-tight">
          <p className="font-display font-semibold text-mist-100 tracking-tight">
            Send<span className="text-signal-violet">ITO</span>
          </p>
          <p className="text-[11px] uppercase tracking-wider text-mist-400">AI Campaign Management</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-4">
        {navItems.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}

        <p className="px-3.5 pb-1 pt-5 text-[11px] font-medium uppercase tracking-wider text-mist-400">
          Tools
        </p>
        {toolItems.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>

      <div className="border-t border-ink-600 px-4 py-4">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-600 text-xs font-semibold text-mist-100 font-mono uppercase">
            {user?.email?.[0] || "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-mist-100">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="rounded-lg p-2 text-mist-400 transition-colors hover:bg-ink-700 hover:text-status-coral"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
