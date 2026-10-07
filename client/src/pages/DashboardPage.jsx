import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const dashboardContent = {
  customer: {
    title: "Your next journey starts here",
    description: "Find your perfect vehicle and keep your rental details close at hand.",
    actions: [
      { title: "Browse vehicles", detail: "Search vehicles, view details, and check availability for your dates.", to: "/vehicles", icon: "🚘", link: "Explore vehicles" },
      { title: "My bookings", detail: "View your current reservations and booking history.", to: "/customer/bookings", icon: "🗓️", link: "View bookings" },
      { title: "Payments", detail: "View your payment history and download your invoices.", to: "/customer/payments", icon: "▤", link: "View payments" },
    ],
  },
  staff: {
    title: "Staff dashboard",
    description: "Manage booking requests, vehicle operations, pickups, and returns.",
    actions: [
      { title: "Vehicle operations", detail: "View vehicles, check availability, and manage day-to-day vehicle operations.", to: "/staff/vehicles", icon: "🚘", link: "Manage vehicles" },
      { title: "Booking requests", detail: "Review pending bookings, approve or reject requests, and manage booking status.", to: "/staff/bookings", icon: "🗓️", link: "Review bookings" },
      { title: "Pickups and returns", detail: "Manage vehicle pickups and returns, record odometer readings, and document vehicle condition or damage.", to: "/staff/rentals", icon: "↔", link: "Manage rentals" },
      { title: "Payments", detail: "Record customer payments, verify payment details, and manage payment history.", to: "/staff/payments", icon: "$", link: "Manage payments" },
      { title: "Maintenance", detail: "Schedule vehicle servicing, track maintenance, and manage service history.", to: "/staff/maintenance", icon: "⚙", link: "Manage maintenance" },
    ],
  },
};

function DashboardPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [operationCounts, setOperationCounts] = useState(null);
  const [bookingsLoaded, setBookingsLoaded] = useState(false);
  const [bookingsLoadError, setBookingsLoadError] = useState(false);
  const dashboard = dashboardContent[user.role] || dashboardContent.customer;

  useEffect(() => {
    let requestIsCurrent = true;

    async function loadDashboardData() {
      if (user.role !== "staff" && user.role !== "customer") return;
      try {
        if (user.role === "customer") {
          const response = await api.get("/bookings");
          if (requestIsCurrent) setBookings(response.data.data.bookings);
        } else {
          const [pendingBookings, approvedBookings, activeRentals, allBookings, payments, maintenanceRecords] = await Promise.all([
            api.get("/bookings", { params: { status: "pending" } }),
            api.get("/bookings", { params: { status: "approved" } }),
            api.get("/rentals", { params: { status: "active" } }),
            api.get("/bookings"),
            api.get("/payments"),
            api.get("/maintenance"),
          ]);
          if (requestIsCurrent) {
            const bookingList = allBookings.data.data.bookings;
            const receivedPayments = payments.data.data.payments.filter((payment) => payment.status === "received");
            const pendingPaymentCount = bookingList.filter((booking) => {
              if (!["approved", "completed"].includes(booking.status)) return false;
              const amountReceived = receivedPayments
                .filter((payment) => payment.booking?._id === booking._id)
                .reduce((total, payment) => total + payment.amount, 0);
              return amountReceived + 0.000001 < booking.totalPrice;
            }).length;
            const now = new Date();
            const todaysPayments = receivedPayments
              .filter((payment) => {
                const receivedAt = new Date(payment.receivedAt);
                return receivedAt.getFullYear() === now.getFullYear()
                  && receivedAt.getMonth() === now.getMonth()
                  && receivedAt.getDate() === now.getDate();
              })
              .reduce((total, payment) => total + payment.amount, 0);

            setOperationCounts({
              pendingBookings: pendingBookings.data.data.bookings.length,
              pickups: approvedBookings.data.data.bookings.length,
              activeRentals: activeRentals.data.data.rentals.length,
              pendingPayments: pendingPaymentCount,
              todaysPayments,
              vehiclesUnderMaintenance: new Set(maintenanceRecords.data.data.maintenance
                .filter((record) => ["scheduled", "in_progress"].includes(record.status))
                .map((record) => record.vehicle?._id)
                .filter(Boolean)).size,
            });
          }
        }
      } catch {
        // Keep the dashboard useful even when the optional summary cannot load.
        if (requestIsCurrent && user.role === "customer") setBookingsLoadError(true);
      } finally {
        if (requestIsCurrent && user.role === "customer") setBookingsLoaded(true);
      }
    }

    loadDashboardData();
    return () => { requestIsCurrent = false; };
  }, [user.role]);

  const activeBooking = bookings.find((booking) => ["pending", "approved", "active"].includes(booking.status));
  const recentBooking = activeBooking || bookings[0];

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-8 text-slate-900 md:py-10">
      <div className="mx-auto max-w-6xl">
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-9">
          <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-cyan-50 md:block" aria-hidden="true" />
          <div className="relative max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-800">{user.role} workspace</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">Welcome back, {user.name} <span aria-hidden="true">👋</span></h1>
            <p className="mt-3 max-w-xl text-base leading-7 text-slate-600">{user.role === "customer" ? "Find your perfect vehicle for your next journey." : dashboard.description}</p>
          </div>
        </section>

        <section className="mt-8" aria-label="Quick actions">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div><p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Workspace</p><h2 className="mt-1 text-xl font-bold">Quick actions</h2></div>
          </div>
          <div className={`grid gap-4 sm:grid-cols-2 ${user.role === "staff" ? "xl:grid-cols-5" : "lg:grid-cols-3"}`}>
            {dashboard.actions.map((action, index) => (
              <article className="group flex min-h-56 flex-col p-5 transition duration-150 hover:-translate-y-0.5 hover:shadow-md" key={action.title}>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ${index === 0 ? "bg-cyan-100 text-cyan-800" : index === 1 ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-700"}`} aria-hidden="true">{action.icon}</div>
                <h3 className="mt-4 text-lg font-bold">{action.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{action.detail}</p>
                <Link className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-cyan-800 hover:text-cyan-800" to={action.to}>{action.link}<span aria-hidden="true">→</span></Link>
              </article>
            ))}
          </div>
        </section>

        {user.role === "customer" && (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Your activity</p><h2 className="mt-1 text-xl font-bold">{activeBooking ? "Current reservation" : "Recent booking"}</h2></div>
              <Link className="text-sm font-semibold text-cyan-800 hover:underline" to="/customer/bookings">All bookings →</Link>
            </div>
            {recentBooking ? (
              <div className="mt-5 flex flex-col justify-between gap-4 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-center">
                <div>
                  <h3 className="font-semibold">{recentBooking.vehicle?.year} {recentBooking.vehicle?.make} {recentBooking.vehicle?.model}</h3>
                  <p className="mt-1 text-sm text-slate-600">{new Date(recentBooking.pickupDate).toLocaleDateString()} – {new Date(recentBooking.returnDate).toLocaleDateString()}</p>
                </div>
                <Link className="text-sm font-semibold text-cyan-800 hover:underline" to={`/bookings/${recentBooking._id}`}>View reservation →</Link>
              </div>
            ) : bookingsLoadError ? (
              <p className="mt-5 rounded-xl bg-amber-50 p-5 text-sm text-amber-900">Your reservations could not be loaded right now. You can try again from My Bookings.</p>
            ) : bookingsLoaded ? (
              <div className="mt-5 rounded-xl bg-slate-50 px-5 py-6 text-center">
                <p className="font-semibold">No active bookings yet.</p><p className="mt-1 text-sm text-slate-600">When you book a vehicle, your reservation will appear here.</p>
                <Link className="mt-4 inline-flex rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-800" to="/vehicles">Browse vehicles</Link>
              </div>
            ) : <p className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">Loading your reservations…</p>}
          </section>
        )}

        {user.role === "staff" && operationCounts && (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6" aria-live="polite">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Daily overview</p><h2 className="mt-1 text-xl font-bold">Today’s operations</h2>
            <dl className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {[["Pending bookings", operationCounts.pendingBookings], ["Approved bookings awaiting pickup", operationCounts.pickups], ["Active rentals", operationCounts.activeRentals], ["Pending payments", operationCounts.pendingPayments], ["Today's payments", `₹${operationCounts.todaysPayments.toLocaleString("en-IN")}`], ["Vehicles under maintenance", operationCounts.vehiclesUnderMaintenance]].map(([label, count]) => <div className="rounded-xl bg-slate-50 p-4" key={label}><dt className="text-sm text-slate-600">{label}</dt><dd className="mt-2 text-2xl font-bold">{count}</dd></div>)}
            </dl>
          </section>
        )}
      </div>
    </main>
  );
}

export default DashboardPage;
