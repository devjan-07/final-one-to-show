import { Outlet, NavLink, useNavigate } from "react-router";
import { useState } from "react";
import { LayoutDashboard, BedDouble, UserCheck, CalendarCheck, Package, MapPin, Car, Settings, User, Globe, Menu, X, LogOut, Sun, Moon, ChevronsLeft, Users, ChevronDown, ChevronRight, ShieldCheck, BriefcaseBusiness } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { VoyAI } from "../../components/VoyAI";
import { NotificationBell } from "../../components/NotificationBell";

const navGroups = [
  {
    heading: "Overview",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
      { to: "/dashboard/bookings", label: "Bookings", icon: CalendarCheck },
    ],
  },
  {
    heading: "Inventory",
    items: [
      { to: "/dashboard/accommodations", label: "Accommodations", icon: BedDouble },
      { to: "/dashboard/packages", label: "Tour Packages", icon: Package },
      { to: "/dashboard/destinations", label: "Destinations", icon: MapPin },
      { to: "/dashboard/vehicles", label: "Vehicle Rentals", icon: Car },
    ],
  },
  {
    heading: "People",
    items: [
      { to: "/dashboard/guides", label: "Tour Guides", icon: UserCheck },
      { to: "/dashboard/tourists", label: "Registered Tourists", icon: Users },
    ],
  },
];

const navigationPermissions: Record<string, string> = {
  "/dashboard": "REPORTS_VIEW", "/dashboard/bookings": "BOOKINGS_MANAGE",
  "/dashboard/accommodations": "INVENTORY_MANAGE", "/dashboard/vehicles": "INVENTORY_MANAGE",
  "/dashboard/guides": "INVENTORY_MANAGE", "/dashboard/packages": "PACKAGES_MANAGE",
  "/dashboard/destinations": "DESTINATIONS_MANAGE", "/dashboard/tourists": "TOURISTS_VIEW",
};

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { logout, user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const displayName = user?.fullName || "Admin";
  const displayIdentifier = user?.email || "Open access";
  const isAdmin = user?.roles.includes("ADMIN");
  const isHotelPartner = user?.roles.includes("HOTEL_PARTNER");
  const isTransportProvider = user?.roles.includes("TRANSPORT_PROVIDER");

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-950 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`group/sidebar fixed md:static inset-y-0 left-0 z-50 flex flex-col shrink-0 transition-[width,transform] duration-300 ease-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"} ${collapsed ? "w-[76px]" : "w-64"}`}
      >
        {/* Backdrop layer: deep navy with a subtle brand glow at the top */}
        <div className="absolute inset-0 -z-10 bg-slate-950 border-r border-white/[0.06]" />
        <div
          className="absolute inset-x-0 top-0 h-56 -z-10 opacity-70 pointer-events-none"
          style={{ background: "radial-gradient(120% 80% at 20% 0%, rgba(0,87,184,0.28), transparent 60%)" }}
        />

        {/* Collapse handle floating on the edge (desktop) */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="hidden md:flex absolute -right-3 top-7 z-10 items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-slate-300 ring-1 ring-white/10 shadow-lg hover:bg-[#0057B8] hover:text-white transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronsLeft className={`w-3.5 h-3.5 transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`} />
        </button>

        {/* Brand */}
        <div className={`flex items-center h-16 shrink-0 ${collapsed ? "justify-center px-0" : "px-5"}`}>
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-[#0057B8]/20"
              style={{ background: "linear-gradient(135deg, #0057B8, #FF385C)" }}
            >
              <Globe className="w-[18px] h-[18px] text-white" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-white font-bold text-[0.95rem] leading-none tracking-tight">Voyara</p>
                <p className="text-[0.62rem] text-slate-500 mt-1 tracking-wide uppercase">{isAdmin ? "Admin Panel" : "Provider Portal"}</p>
              </div>
            )}
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden ml-auto text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className={`flex-1 py-3 overflow-y-auto ${collapsed ? "px-3" : "px-3"} [scrollbar-width:none]`}>
          {navGroups.map(group => ({ ...group, items: group.items.filter(item => user?.permissions?.includes(navigationPermissions[item.to])) }))
            .filter(group => group.items.length > 0).map((group) => (
            <div key={group.heading} className="mb-5 last:mb-0">
              {!collapsed ? (
                <p className="px-3 mb-1.5 text-[0.62rem] font-semibold text-slate-600 tracking-[0.12em] uppercase">{group.heading}</p>
              ) : (
                <div className="mx-3 mb-2 h-px bg-white/[0.06]" />
              )}
              <div className="space-y-1">
                {group.items.map(({ to, label, icon: Icon, end }) => (
                  <NavLink key={to} to={to} end={end} onClick={() => setSidebarOpen(false)}>
                    {({ isActive }) => (
                      <div
                        title={collapsed ? label : undefined}
                        className={`relative flex items-center rounded-xl cursor-pointer transition-colors duration-200 ${collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"} ${
                          isActive
                            ? "bg-gradient-to-r from-[#FF385C]/15 to-transparent text-white"
                            : "text-slate-400 hover:text-white hover:bg-white/[0.05]"
                        }`}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-[#FF385C]" />
                        )}
                        <Icon
                          className="w-[18px] h-[18px] shrink-0 transition-colors"
                          style={{ strokeWidth: isActive ? 2.3 : 1.8, color: isActive ? "#FF385C" : undefined }}
                        />
                        {!collapsed && <span className={`text-[0.85rem] ${isActive ? "font-semibold" : "font-normal"}`}>{label}</span>}
                      </div>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
          {isHotelPartner && (
            <div className="mb-5">
              {!collapsed && <p className="px-3 mb-1.5 text-[0.62rem] font-semibold text-slate-600 tracking-[0.12em] uppercase">Properties</p>}
              <NavLink to="/stakeholder/accommodations" onClick={() => setSidebarOpen(false)}>
                {({ isActive }) => <div className={`relative flex items-center rounded-xl transition-colors ${collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"} ${isActive ? "bg-white/[0.08] text-white" : "text-slate-400 hover:bg-white/[0.05] hover:text-white"}`}><BedDouble className="h-[18px] w-[18px]" />{!collapsed && <span className="text-[0.85rem]">My Properties</span>}</div>}
              </NavLink>
              <NavLink to="/stakeholder/bookings" onClick={() => setSidebarOpen(false)}>
                {({ isActive }) => <div className={`relative mt-1 flex items-center rounded-xl transition-colors ${collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"} ${isActive ? "bg-white/[0.08] text-white" : "text-slate-400 hover:bg-white/[0.05] hover:text-white"}`}><CalendarCheck className="h-[18px] w-[18px]" />{!collapsed && <span className="text-[0.85rem]">Property Bookings</span>}</div>}
              </NavLink>
            </div>
          )}
          {isTransportProvider && (
            <div className="mb-5">
              {!collapsed && <p className="px-3 mb-1.5 text-[0.62rem] font-semibold text-slate-600 tracking-[0.12em] uppercase">Fleet</p>}
              <NavLink to="/stakeholder/vehicles" onClick={() => setSidebarOpen(false)}>{({ isActive }) => <div className={`relative flex items-center rounded-xl transition-colors ${collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"} ${isActive ? "bg-white/[0.08] text-white" : "text-slate-400 hover:bg-white/[0.05] hover:text-white"}`}><Car className="h-[18px] w-[18px]" />{!collapsed && <span className="text-[0.85rem]">My Vehicles</span>}</div>}</NavLink>
              <NavLink to="/stakeholder/vehicle-bookings" onClick={() => setSidebarOpen(false)}>{({ isActive }) => <div className={`relative mt-1 flex items-center rounded-xl transition-colors ${collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"} ${isActive ? "bg-white/[0.08] text-white" : "text-slate-400 hover:bg-white/[0.05] hover:text-white"}`}><CalendarCheck className="h-[18px] w-[18px]" />{!collapsed && <span className="text-[0.85rem]">Vehicle Bookings</span>}</div>}</NavLink>
            </div>
          )}
        </nav>

        {/* Bottom */}
        <div className={`shrink-0 pb-3 pt-2 ${collapsed ? "px-3" : "px-3"}`}>
          <button
            title={collapsed ? "Settings" : undefined}
            onClick={() => setSettingsOpen((open) => !open)}
            className={`w-full flex items-center rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors ${collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"}`}
          >
            <Settings className="w-[18px] h-[18px] shrink-0" />
            {!collapsed && <><span className="flex-1 text-left text-[0.85rem]">Settings</span>{settingsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</>}
          </button>
          {settingsOpen && !collapsed && (
            <div className="space-y-1">
              {isAdmin && <NavLink to="/dashboard/access-control" onClick={() => setSidebarOpen(false)}>
                {({ isActive }) => <div className={`ml-4 mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.82rem] transition-colors ${isActive ? "bg-white/[0.08] text-white" : "text-slate-500 hover:bg-white/[0.05] hover:text-white"}`}><ShieldCheck className="h-4 w-4" style={{ color: isActive ? "#FF385C" : undefined }} />Access Control</div>}
              </NavLink>}
              {isAdmin && <NavLink to="/dashboard/stakeholders" onClick={() => setSidebarOpen(false)}>
                {({ isActive }) => <div className={`ml-4 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.82rem] transition-colors ${isActive ? "bg-white/[0.08] text-white" : "text-slate-500 hover:bg-white/[0.05] hover:text-white"}`}><BriefcaseBusiness className="h-4 w-4" style={{ color: isActive ? "#FF385C" : undefined }} />Stakeholders</div>}
              </NavLink>}
              {!isAdmin && <NavLink to="/stakeholder/profile" onClick={() => setSidebarOpen(false)}>
                {({ isActive }) => <div className={`ml-4 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.82rem] transition-colors ${isActive ? "bg-white/[0.08] text-white" : "text-slate-500 hover:bg-white/[0.05] hover:text-white"}`}><User className="h-4 w-4" style={{ color: isActive ? "#FF385C" : undefined }} />My Profile</div>}
              </NavLink>}
            </div>
          )}
          <button
            title={collapsed ? "Sign Out" : undefined}
            onClick={handleLogout}
            className={`w-full flex items-center rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors ${collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"}`}
          >
            <LogOut className="w-[18px] h-[18px] shrink-0" />
            {!collapsed && <span className="text-[0.85rem]">Sign Out</span>}
          </button>

          {/* User card */}
          <div className={`mt-2 flex items-center rounded-2xl bg-white/[0.04] ring-1 ring-white/[0.06] ${collapsed ? "justify-center p-2" : "gap-3 p-2.5"}`}>
            <div
              title={collapsed ? `${displayName} — ${displayIdentifier}` : undefined}
              className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center shadow-md"
              style={{ background: "linear-gradient(135deg, #0057B8, #FF385C)" }}
            >
              <User className="w-[18px] h-[18px] text-white" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-[0.8rem] font-semibold text-white leading-tight">{displayName}</p>
                <p className="truncate text-[0.66rem] text-slate-500">{displayIdentifier}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />}
      <VoyAI />

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 bg-white dark:bg-slate-900 flex items-center px-4 md:px-6 gap-4 shrink-0 border-b border-gray-200 dark:border-slate-700/60">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800">
            <Menu className="w-5 h-5 text-gray-600 dark:text-slate-400" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark
                ? <Sun className="w-4.5 h-4.5 text-amber-400" />
                : <Moon className="w-4.5 h-4.5 text-slate-500" />
              }
            </button>
            <NotificationBell />
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #FF385C, #E31C5F)" }}>
              <User className="w-4 h-4 text-white" />
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-5 md:p-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
