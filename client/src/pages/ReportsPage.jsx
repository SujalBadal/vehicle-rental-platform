import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const chartColors = ["#0e7490", "#2563eb", "#16a34a", "#ca8a04", "#dc2626", "#7c3aed"];

function ReportsPage() {
  const { user } = useAuth();
  const isAdmin = user.role === "admin";
  const [months, setMonths] = useState("6");
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let requestIsCurrent = true;

    async function loadReports() {
      setLoading(true);
      setErrorMessage("");
      const requests = [
        api.get("/reports/overview"),
        api.get("/reports/bookings", { params: { months } }),
        api.get("/reports/fleet"),
        api.get("/reports/maintenance", { params: { months } }),
      ];
      if (isAdmin) requests.push(api.get("/reports/revenue", { params: { months } }));

      try {
        const responses = await Promise.all(requests);
        if (!requestIsCurrent) return;

        setReports({
          overview: responses[0].data.data,
          bookings: responses[1].data.data,
          fleet: responses[2].data.data,
          maintenance: responses[3].data.data,
          revenue: isAdmin ? responses[4].data.data : null,
        });
      } catch (error) {
        if (requestIsCurrent) setErrorMessage(error.response?.data?.message || "Could not load reports.");
      } finally {
        if (requestIsCurrent) setLoading(false);
      }
    }

    loadReports();
    return () => { requestIsCurrent = false; };
  }, [months, isAdmin]);

  const bookingChartRows = [];
  const bookingStatuses = ["pending", "approved", "rejected", "cancelled", "completed"];
  if (reports?.bookings.monthly) {
    const monthlyCounts = new Map();
    for (const item of reports.bookings.monthly) {
      if (!monthlyCounts.has(item.month)) monthlyCounts.set(item.month, { month: item.month });
      monthlyCounts.get(item.month)[item.status] = item.count;
    }
    bookingChartRows.push(...monthlyCounts.values());
  }

  const fleetStatusCounts = (reports?.overview.vehiclesByStatus || []).map((item) => ({ name: item.status, value: item.count }));
  const bookingCount = (reports?.overview.bookingsByStatus || []).reduce((total, item) => total + item.count, 0);
  const vehicleCount = (reports?.overview.vehiclesByStatus || []).reduce((total, item) => total + item.count, 0);

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <Link className="text-sm font-semibold text-cyan-800 hover:underline" to="/">← Back to Dashboard</Link>
        <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-800">Operations</p><h1 className="mt-2 text-3xl font-bold">{isAdmin ? "Admin reports" : "Operational reports"}</h1></div>
          <label className="text-sm font-medium">Chart range
            <select className="ml-2 rounded-lg border border-slate-300 bg-white px-3 py-2" value={months} onChange={(event) => setMonths(event.target.value)}><option value="3">Last 3 months</option><option value="6">Last 6 months</option><option value="12">Last 12 months</option></select>
          </label>
        </div>

        {errorMessage && <p className="mt-5 rounded-lg bg-red-50 p-4 text-red-800" role="alert">{errorMessage}</p>}
        {loading ? <p className="py-12 text-center text-slate-600">Loading reports…</p> : reports && (
          <>
            <section className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <article className="rounded-xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Bookings (all time)</p><p className="mt-2 text-3xl font-bold">{bookingCount}</p></article>
              <article className="rounded-xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Vehicles</p><p className="mt-2 text-3xl font-bold">{vehicleCount}</p></article>
              <article className="rounded-xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Active rentals</p><p className="mt-2 text-3xl font-bold">{reports.overview.activeRentals}</p></article>
              <article className="rounded-xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Open maintenance jobs</p><p className="mt-2 text-3xl font-bold">{reports.overview.openMaintenance}</p></article>
            </section>

            {isAdmin && <section className="mt-6 rounded-xl bg-white p-6 shadow-sm"><p className="text-sm text-slate-500">Lifetime recorded payment receipts</p><p className="mt-2 text-3xl font-bold">₹{reports.revenue.lifetimeRecordedReceipts.toLocaleString()}</p><p className="mt-2 text-xs text-slate-500">Based on staff-recorded receipts, not payment-provider transactions.</p></section>}

            <section className="mt-6 grid gap-6 lg:grid-cols-2">
              <article className="rounded-xl bg-white p-5 shadow-sm">
                <h2 className="font-semibold">Bookings by month and status</h2>
                {bookingChartRows.length === 0 ? <p className="py-12 text-center text-sm text-slate-500">No bookings in this period.</p> : <div className="mt-4 h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={bookingChartRows}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis allowDecimals={false} /><Tooltip /><Legend />{bookingStatuses.map((status, index) => <Line key={status} type="monotone" dataKey={status} stroke={chartColors[index]} connectNulls />)}</LineChart></ResponsiveContainer></div>}
              </article>

              <article className="rounded-xl bg-white p-5 shadow-sm">
                <h2 className="font-semibold">Fleet by status</h2>
                {fleetStatusCounts.length === 0 ? <p className="py-12 text-center text-sm text-slate-500">No vehicles yet.</p> : <div className="mt-4 h-72"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={fleetStatusCounts} dataKey="value" nameKey="name" outerRadius={95} label>{fleetStatusCounts.map((item, index) => <Cell key={item.name} fill={chartColors[index % chartColors.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div>}
              </article>

              <article className="rounded-xl bg-white p-5 shadow-sm">
                <h2 className="font-semibold">Maintenance cost by month</h2>
                {reports.maintenance.monthlyCost.length === 0 ? <p className="py-12 text-center text-sm text-slate-500">No completed maintenance costs in this period.</p> : <div className="mt-4 h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={reports.maintenance.monthlyCost}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip formatter={(value) => `₹${value}`} /><Bar dataKey="cost" fill="#0e7490" name="Cost (INR)" /></BarChart></ResponsiveContainer></div>}
              </article>

              <article className="rounded-xl bg-white p-5 shadow-sm">
                <h2 className="font-semibold">Fleet by category</h2>
                {reports.fleet.byCategory.length === 0 ? <p className="py-12 text-center text-sm text-slate-500">No vehicles yet.</p> : <div className="mt-4 h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={reports.fleet.byCategory}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="category" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="#2563eb" name="Vehicles" /></BarChart></ResponsiveContainer></div>}
              </article>

              {isAdmin && <article className="rounded-xl bg-white p-5 shadow-sm lg:col-span-2"><h2 className="font-semibold">Recorded revenue by month</h2>{reports.revenue.monthly.length === 0 ? <p className="py-12 text-center text-sm text-slate-500">No recorded payment receipts in this period.</p> : <div className="mt-4 h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={reports.revenue.monthly}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip formatter={(value) => `₹${value}`} /><Bar dataKey="amount" fill="#16a34a" name="Recorded receipts (INR)" /></BarChart></ResponsiveContainer></div>}</article>}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

export default ReportsPage;
