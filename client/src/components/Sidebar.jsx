import { NavLink, useLocation } from "react-router-dom";

const sidebarItems = {
  admin: [
    { label: "Dashboard", to: "/admin/dashboard", end: true },
    { label: "Staff", to: "/admin/staff" },
    { label: "Vehicles", to: "/admin/vehicles" },
    { label: "Categories", to: "/admin/categories" },
    { label: "Bookings", to: "/admin/bookings" },
    { label: "Payments", to: "/admin/payments" },
    { label: "Business Settings", to: "/admin/business-settings" },
  ],
  staff: [
    { label: "Dashboard", to: "/staff/dashboard", end: true },
    { label: "Bookings", to: "/staff/bookings" },
    { label: "Payments", to: "/staff/payments" },
    { label: "Vehicle Pickups", to: "/staff/rentals" },
    { label: "Vehicle Returns", to: "/staff/rentals#vehicle-returns" },
    { label: "Maintenance", to: "/staff/maintenance" },
    { label: "Notifications", to: "/notifications", notifications: true },
    { label: "Profile", to: "/profile" },
  ],
};

function Sidebar({ role, unreadCount, isOpen, onClose, onLogout }) {
  const location = useLocation();
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

  function isItemActive(item, isActive) {
    if (item.label === "Vehicle Returns") {
      return location.pathname === "/staff/rentals" && location.hash === "#vehicle-returns";
    }
    if (item.label === "Vehicle Pickups") {
      return location.pathname === "/staff/rentals" && location.hash !== "#vehicle-returns";
    }
    return isActive;
  }

  return (
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-800 bg-slate-950 text-white transition-transform duration-200 lg:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="border-b border-slate-800 px-5 py-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-700 text-sm font-black text-white">SC</span>
          <div><p className="text-xs font-bold uppercase tracking-[0.15em] text-cyan-300">SMART CAR</p><p className="text-xs font-semibold uppercase tracking-[0.15em] text-white">RENTAL</p></div>
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{roleLabel} workspace</p>
      </div>

      <nav aria-label={`${roleLabel} navigation`} className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Workspace</p>
        {sidebarItems[role].map((item) => (
          <NavLink
            aria-label={item.notifications && unreadCount > 0 ? `${item.label}, ${unreadCount} unread` : item.label}
            className={({ isActive }) => `flex items-center justify-between rounded-xl border-l-2 px-3 py-2.5 text-sm font-medium transition-colors ${isItemActive(item, isActive) ? "border-cyan-300 bg-cyan-700/20 text-white" : "border-transparent text-slate-300 hover:bg-slate-800 hover:text-white"}`}
            end={item.end}
            key={item.label}
            onClick={onClose}
            to={item.to}
          >
            <span className="flex items-center gap-3"><span aria-hidden="true" className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs ${isItemActive(item, location.pathname === item.to.split("?")[0]) ? "bg-cyan-700 text-white" : "bg-slate-900 text-slate-400"}`}>{item.label === "Dashboard" ? "⌂" : item.label === "Vehicles" || item.label === "Vehicle Pickups" || item.label === "Vehicle Returns" ? "▰" : item.label === "Staff" ? "♙" : item.label === "Categories" ? "▦" : item.label === "Bookings" ? "▤" : item.label === "Payments" ? "$" : item.label === "Maintenance" ? "⚙" : item.label === "Reports" ? "▥" : item.label === "Notifications" ? "♧" : "○"}</span>{item.label}</span>
            {item.notifications && unreadCount > 0 && <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-slate-950" />}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-800 p-3">
        <button className="w-full rounded-xl px-3 py-3 text-left text-sm font-semibold text-slate-300 transition hover:bg-red-950/60 hover:text-white" onClick={onLogout} type="button">
          Log out
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
