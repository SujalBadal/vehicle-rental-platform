import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const quickActions = [
  { label: "Manage Staff", to: "/admin/staff" },
  { label: "Manage Vehicles", to: "/admin/vehicles" },
  { label: "View Bookings", to: "/admin/bookings" },
  { label: "View Payments", to: "/admin/payments" },
];

function formatDate(value) {
  return new Date(value).toLocaleDateString("en-IN");
}

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function AdminDashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let requestIsCurrent = true;

    async function loadDashboard() {
      try {
        const [overviewResponse, revenueResponse, bookingResponse, staffResponse] = await Promise.all([
          api.get("/reports/overview"),
          api.get("/reports/revenue"),
          api.get("/bookings"),
          api.get("/users", { params: { role: "staff" } }),
        ]);

        if (!requestIsCurrent) return;

        const overview = overviewResponse.data.data;
        const bookings = bookingResponse.data.data.bookings;
        const countTotal = (items) => items.reduce((total, item) => total + item.count, 0);

        setSummary({
          vehicles: countTotal(overview.vehiclesByStatus),
          bookings: countTotal(overview.bookingsByStatus),
          staff: staffResponse.data.data.users.length,
          revenue: revenueResponse.data.data.lifetimeRecordedReceipts,
        });
        setRecentBookings(bookings.slice(0, 5));
      } catch (error) {
        if (requestIsCurrent) {
          setErrorMessage(error.response?.data?.message || "Could not load the dashboard information.");
        }
      } finally {
        if (requestIsCurrent) setLoading(false);
      }
    }

    loadDashboard();
    return () => { requestIsCurrent = false; };
  }, []);

  const cards = [
    ["Total Vehicles", summary?.vehicles],
    ["Total Bookings", summary?.bookings],
    ["Total Staff", summary?.staff],
    ["Total Revenue", summary ? formatCurrency(summary.revenue) : undefined],
  ];

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-8 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-7">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-800">Admin workspace</p>
          <h1 className="mt-2 text-3xl font-bold">Welcome back, {user.name} 👋</h1>
          <p className="mt-2 text-slate-600">Manage your rental business from one place.</p>
        </section>

        {errorMessage && <p className="rounded-lg bg-red-50 p-4 text-sm text-red-800" role="alert">{errorMessage}</p>}

        <section aria-label="Business summary">
          <h2 className="mb-4 text-xl font-bold">Business summary</h2>
          <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map(([label, value]) => (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" key={label}>
                <dt className="text-sm font-medium text-slate-600">{label}</dt>
                <dd className="mt-2 text-2xl font-bold text-slate-950">{loading ? "Loading…" : value ?? "—"}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-label="Recent bookings">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <h2 className="text-xl font-bold">Recent bookings</h2>
            <Link className="text-sm font-semibold text-cyan-800 hover:underline" to="/admin/bookings">View all bookings →</Link>
          </div>
          {errorMessage ? (
            <p className="p-5 text-sm text-slate-600">Recent bookings are unavailable right now.</p>
          ) : loading ? (
            <p className="p-5 text-sm text-slate-600">Loading recent bookings…</p>
          ) : recentBookings.length === 0 ? (
            <p className="p-5 text-sm text-slate-600">No bookings to show yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Booking ID</th>
                    <th className="px-5 py-3 font-semibold">Vehicle</th>
                    <th className="px-5 py-3 font-semibold">Customer</th>
                    <th className="px-5 py-3 font-semibold">Pickup Date</th>
                    <th className="px-5 py-3 font-semibold">Return Date</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentBookings.map((booking) => (
                    <tr className="text-slate-700" key={booking._id}>
                      <td className="px-5 py-4 font-medium text-slate-900">{booking._id}</td>
                      <td className="px-5 py-4">{[booking.vehicle?.year, booking.vehicle?.make, booking.vehicle?.model].filter(Boolean).join(" ") || "Vehicle unavailable"}</td>
                      <td className="px-5 py-4">{booking.customer?.name || "Customer unavailable"}</td>
                      <td className="px-5 py-4">{formatDate(booking.pickupDate)}</td>
                      <td className="px-5 py-4">{formatDate(booking.returnDate)}</td>
                      <td className="px-5 py-4"><StatusBadge status={booking.status} /></td>
                      <td className="px-5 py-4 text-right font-medium text-slate-900">{formatCurrency(booking.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section aria-label="Quick actions">
          <h2 className="mb-4 text-xl font-bold">Quick actions</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {quickActions.map((action) => (
              <Link className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 font-semibold text-slate-800 shadow-sm transition hover:border-cyan-300 hover:text-cyan-800" key={action.to} to={action.to}>
                {action.label}<span aria-hidden="true">→</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export default AdminDashboardPage;
