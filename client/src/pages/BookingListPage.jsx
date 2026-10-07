import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import StatusBadge from "../components/StatusBadge";

function BookingListPage() {
  const { user } = useAuth();
  const canManageBookings = ["staff", "admin"].includes(user.role);
  const [bookings, setBookings] = useState([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let requestIsCurrent = true;

    async function loadBookings() {
      setLoading(true);
      setErrorMessage("");
      try {
        const response = await api.get("/bookings", { params: status ? { status } : {} });
        if (requestIsCurrent) setBookings(response.data.data.bookings);
      } catch (error) {
        if (requestIsCurrent) setErrorMessage(error.response?.data?.message || "Could not load bookings.");
      } finally {
        if (requestIsCurrent) setLoading(false);
      }
    }

    loadBookings();
    return () => { requestIsCurrent = false; };
  }, [status]);

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-10 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <Link className="text-sm font-semibold text-cyan-800 hover:underline" to={user.role === "admin" ? "/admin/dashboard" : "/"}>← Back to Dashboard</Link>
        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-800">{canManageBookings ? "Operations" : "Customer account"}</p>
            <h1 className="mt-2 text-3xl font-bold">{canManageBookings ? "Booking requests" : "My bookings"}</h1>
          </div>
          <label className="text-sm font-medium">Filter by status
            <select className="ml-2 rounded-lg border border-slate-300 bg-white px-3 py-2" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="cancelled">Cancelled</option><option value="completed">Completed</option>
            </select>
          </label>
        </div>

        {loading && <p className="py-10 text-center text-slate-600">Loading bookings…</p>}
        {errorMessage && <p className="mt-5 rounded-lg bg-red-50 p-4 text-red-800" role="alert">{errorMessage}</p>}
        {!loading && !errorMessage && bookings.length === 0 && <p className="mt-7 rounded-xl bg-white p-8 text-center text-slate-600">No bookings to show.</p>}

        <section className="mt-6 space-y-4">
          {bookings.map((booking) => (
            <article className="rounded-xl bg-white p-5 shadow-sm" key={booking._id}>
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <p className="text-sm text-slate-500">{booking._id}</p>
                  <h2 className="mt-1 text-lg font-semibold">{booking.vehicle?.year} {booking.vehicle?.make} {booking.vehicle?.model}</h2>
                  {canManageBookings && <p className="mt-1 text-sm text-slate-600">Customer: {booking.customer?.name} ({booking.customer?.email})</p>}
                  <p className="mt-2 text-sm text-slate-600">{new Date(booking.pickupDate).toLocaleDateString()} – {new Date(booking.returnDate).toLocaleDateString()}</p>
                  <p className="mt-1 text-sm text-slate-600">Total: ₹{booking.totalPrice}</p>
                </div>
                <StatusBadge status={booking.status} />
              </div>
              <Link className="mt-4 inline-block text-sm font-semibold text-cyan-800 hover:underline" to={`/bookings/${booking._id}`}>View booking details →</Link>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

export default BookingListPage;
