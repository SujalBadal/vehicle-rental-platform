import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Sidebar from "./Sidebar";

function AuthenticatedLayout({ children }) {
  const { user, logout, unreadCount } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const roleLabel = user.role.charAt(0).toUpperCase() + user.role.slice(1);
  const hasSidebar = user.role === "admin" || user.role === "staff";

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  if (!hasSidebar) {
    return (
      <>
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white text-slate-900 shadow-sm">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-cyan-300">SC</span>
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.13em] text-slate-950">SMART CAR RENTAL</p>
                <p className="mt-0.5 text-xs font-medium text-slate-500">{roleLabel} workspace</p>
              </div>
            </div>
            <button
              aria-expanded={sidebarOpen}
              aria-label={sidebarOpen ? "Close customer navigation" : "Open customer navigation"}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 lg:hidden"
              onClick={() => setSidebarOpen((open) => !open)}
              type="button"
            >
              {sidebarOpen ? "Close" : "☰ Menu"}
            </button>
            <nav className={`${sidebarOpen ? "flex" : "hidden"} w-full flex-col gap-1 border-t border-slate-200 pt-3 lg:flex lg:w-auto lg:flex-row lg:items-center lg:gap-1 lg:border-0 lg:pt-0`}>
              {[
                ["Browse Vehicles", "/vehicles"],
                ["My Bookings", "/customer/bookings"],
                ["Payments", "/customer/payments"],
                ["Invoices", "/customer/invoices"],
                ["Profile", "/profile"],
              ].map(([label, to]) => (
                <NavLink className={({ isActive }) => `rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${isActive ? "bg-cyan-50 text-cyan-800" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`} key={to} onClick={() => setSidebarOpen(false)} to={to}>
                  {label}
                </NavLink>
              ))}
              <Link
                aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
                className="relative rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950"
                onClick={() => setSidebarOpen(false)}
                to="/notifications"
              >
                Notifications
                {unreadCount > 0 && <span aria-hidden="true" className="absolute right-1.5 top-1 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />}
              </Link>
              <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50" onClick={handleLogout} type="button">Log out</button>
            </nav>
          </div>
        </header>
        {children}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
        role={user.role}
        unreadCount={unreadCount}
      />
      {sidebarOpen && <button aria-label="Close navigation" className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden" onClick={() => setSidebarOpen(false)} type="button" />}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950 text-white lg:hidden">
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">SMART CAR RENTAL</p>
              <p className="mt-1 text-sm text-slate-300">{roleLabel} workspace</p>
            </div>
            <button
              aria-expanded={sidebarOpen}
              aria-label={sidebarOpen ? "Close navigation menu" : "Open navigation menu"}
              className="rounded-lg border border-slate-600 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              onClick={() => setSidebarOpen((open) => !open)}
              type="button"
            >
              {sidebarOpen ? "Close" : "☰ Menu"}
            </button>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

export default AuthenticatedLayout;
