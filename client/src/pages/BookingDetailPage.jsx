import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import StatusBadge from "../components/StatusBadge";

function BookingDetailPage() {
  const { bookingId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [rejectionReason, setRejectionReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");
  const canManage = ["staff", "admin"].includes(user.role);
  const canCancel = booking && ["pending", "approved"].includes(booking.status) && new Date(booking.pickupDate) > new Date();

  async function loadBooking() {
    setLoading(true);
    try {
      const response = await api.get(`/bookings/${bookingId}`);
      setBooking(response.data.data.booking);
      setErrorMessage("");

      if (canManage) {
        setPaymentsLoading(true);
        try {
          const paymentResponse = await api.get("/payments", { params: { bookingId } });
          setPayments(paymentResponse.data.data.payments);
        } catch {
          setPayments([]);
        } finally {
          setPaymentsLoading(false);
        }
      }
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Could not load booking.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBooking();
  }, [bookingId]);

  const receivedAmount = payments
    .filter((payment) => payment.status === "received")
    .reduce((total, payment) => total + payment.amount, 0);
  const amountDue = booking ? Math.max(0, booking.totalPrice - receivedAmount) : 0;
  const paymentIsComplete = booking && amountDue <= 0.000001;
  const paymentStatus = paymentIsComplete ? "Paid" : receivedAmount > 0 ? "Partially paid" : "Unpaid";
  const rentalDays = booking ? Math.ceil((new Date(booking.returnDate) - new Date(booking.pickupDate)) / (24 * 60 * 60 * 1000)) : 0;

  async function cancelBooking() {
    setSaving(true);
    setErrorMessage("");
    setNotice("");
    try {
      await api.patch(`/bookings/${bookingId}/cancel`);
      setNotice("Booking cancelled.");
      await loadBooking();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Could not cancel booking.");
    } finally {
      setSaving(false);
    }
  }

  async function decideBooking(status) {
    setSaving(true);
    setErrorMessage("");
    setNotice("");
    try {
      await api.patch(`/bookings/${bookingId}/decision`, { status, rejectionReason });
      setNotice(`Booking ${status}.`);
      await loadBooking();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Could not update booking.");
    } finally {
      setSaving(false);
    }
  }

  async function goBack() {
    navigate(canManage ? "/staff/bookings" : "/customer/bookings");
  }

  if (loading) return <main className="p-10 text-center text-slate-600">Loading booking…</main>;
  if (!booking) return <main className="mx-auto max-w-3xl p-10"><p role="alert" className="text-red-700">{errorMessage || "Booking not found."}</p><button className="mt-4 text-cyan-800 underline" onClick={goBack} type="button">Back to bookings</button></main>;

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-10 text-slate-900">
      <div className="mx-auto max-w-3xl">
        <Link className="text-sm font-semibold text-cyan-800 hover:underline" to={canManage ? "/staff/bookings" : "/customer/bookings"}>← Back to bookings</Link>
        <section className="mt-5 rounded-2xl bg-white p-7 shadow-sm">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div><p className="text-sm text-slate-500">Booking reference</p><p className="mt-1 break-all font-mono text-sm">{booking._id}</p></div>
            <StatusBadge status={booking.status} />
          </div>

          <h1 className="mt-7 text-2xl font-bold">{booking.vehicle?.year} {booking.vehicle?.make} {booking.vehicle?.model}</h1>
          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
            <div><dt className="text-slate-500">Registration number</dt><dd className="mt-1 font-medium">{booking.vehicle?.registrationNumber || "Not provided"}</dd></div>
            <div><dt className="text-slate-500">Pickup</dt><dd className="mt-1 font-medium">{new Date(booking.pickupDate).toLocaleDateString()}</dd></div>
            <div><dt className="text-slate-500">Return</dt><dd className="mt-1 font-medium">{new Date(booking.returnDate).toLocaleDateString()}</dd></div>
            <div><dt className="text-slate-500">Total days</dt><dd className="mt-1 font-medium">{rentalDays}</dd></div>
            <div><dt className="text-slate-500">Daily rate</dt><dd className="mt-1 font-medium">₹{booking.dailyRate}</dd></div>
            <div><dt className="text-slate-500">Amount</dt><dd className="mt-1 font-medium">₹{booking.totalPrice}</dd></div>
            {canManage && (
              <div className="sm:col-span-2">
                <dt className="text-slate-500">Customer</dt>
                <dd className="mt-1 font-medium">{booking.customer?.name}</dd>
                <dd className="mt-1 text-slate-700">Phone: {booking.customer?.mobile || "Not provided"}</dd>
                <dd className="mt-1 text-slate-700">Email: {booking.customer?.email}</dd>
                {booking.customer?.driverLicenseNumber && <dd className="mt-1 text-slate-700">Driving licence: {booking.customer.driverLicenseNumber}</dd>}
              </div>
            )}
            {booking.rejectionReason && <div className="sm:col-span-2"><dt className="text-slate-500">Reason provided</dt><dd className="mt-1 font-medium">{booking.rejectionReason}</dd></div>}
          </dl>

          {canManage && (
            <section className="mt-7 border-t border-slate-200 pt-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Payment</h2>
                  <p className="mt-1 text-sm text-slate-600">Amount due: ₹{amountDue.toLocaleString("en-IN")}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-sm font-semibold ${paymentIsComplete ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
                  {paymentStatus}
                </span>
              </div>
              {paymentsLoading ? <p className="mt-4 text-sm text-slate-600">Loading payment details…</p> : payments.length === 0 ? <p className="mt-4 text-sm text-slate-600">No payment has been recorded for this booking.</p> : (
                <div className="mt-4 space-y-3">
                  {payments.map((payment) => (
                    <div className="rounded-xl bg-slate-50 p-4 text-sm" key={payment._id}>
                      <div className="flex flex-wrap justify-between gap-2"><span className="font-semibold">₹{payment.amount.toLocaleString("en-IN")} · {payment.method.toUpperCase()}</span><span>{payment.status === "received" ? "Paid" : "Refunded"}</span></div>
                      {payment.transactionReference && <p className="mt-1 text-slate-600">Reference: {payment.transactionReference}</p>}
                      <p className="mt-1 text-slate-600">Recorded by {payment.recordedBy?.name || "Staff"} · {new Date(payment.receivedAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-4">
                {!paymentIsComplete && ["approved", "completed"].includes(booking.status) && <Link className="text-sm font-semibold text-cyan-800 hover:underline" to={`/staff/payments?bookingId=${booking._id}#record-payment`}>Record payment →</Link>}
                {paymentIsComplete && <Link className="text-sm font-semibold text-cyan-800 hover:underline" to={user.role === "admin" ? "/admin/invoices" : "/staff/invoices"}>View or generate invoice →</Link>}
              </div>
            </section>
          )}

          {notice && <p className="mt-6 rounded-lg bg-emerald-50 p-3 text-emerald-800" role="status">{notice}</p>}
          {errorMessage && <p className="mt-6 rounded-lg bg-red-50 p-3 text-red-800" role="alert">{errorMessage}</p>}

          {canManage && booking.status === "pending" && (
            <div className="mt-7 border-t border-slate-200 pt-6">
              <label className="block text-sm font-medium">Rejection reason (optional)<textarea className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2" maxLength="500" rows="2" value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} /></label>
              <div className="mt-4 flex flex-wrap gap-3">
                <button className="rounded-lg bg-emerald-700 px-4 py-2.5 font-semibold text-white hover:bg-emerald-800 disabled:opacity-60" disabled={saving} onClick={() => decideBooking("approved")} type="button">Approve booking</button>
                <button className="rounded-lg bg-red-700 px-4 py-2.5 font-semibold text-white hover:bg-red-800 disabled:opacity-60" disabled={saving} onClick={() => decideBooking("rejected")} type="button">Reject booking</button>
              </div>
            </div>
          )}

          {!canManage && canCancel && <button className="mt-7 rounded-lg border border-red-300 px-4 py-2.5 font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60" disabled={saving} onClick={cancelBooking} type="button">Cancel booking</button>}
        </section>
      </div>
    </main>
  );
}

export default BookingDetailPage;
