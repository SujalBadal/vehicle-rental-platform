import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

function PaymentPage() {
  const { user } = useAuth();
  const canRecordPayment = ["staff", "admin"].includes(user.role);
  const [searchParams] = useSearchParams();
  const [payments, setPayments] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [selectedBookingId, setSelectedBookingId] = useState(() => searchParams.get("bookingId") || "");
  const [method, setMethod] = useState("cash");
  const [transactionReference, setTransactionReference] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");

  async function loadPaymentData() {
    setLoading(true);
    try {
      const requests = [api.get("/payments")];
      if (canRecordPayment) requests.push(api.get("/bookings"));
      const responses = await Promise.all(requests);
      setPayments(responses[0].data.data.payments);
      if (canRecordPayment) setBookings(responses[1].data.data.bookings);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Could not load payment information.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPaymentData();
  }, []);

  function receivedForBooking(bookingId) {
    return payments
      .filter((payment) => payment.booking?._id === bookingId && payment.status === "received")
      .reduce((total, payment) => total + payment.amount, 0);
  }

  const pendingBookings = useMemo(() => bookings.filter((booking) => {
    if (!["approved", "completed"].includes(booking.status)) return false;
    const totalReceived = payments
      .filter((payment) => payment.booking?._id === booking._id && payment.status === "received")
      .reduce((total, payment) => total + payment.amount, 0);
    return totalReceived + 0.000001 < booking.totalPrice;
  }), [bookings, payments]);

  const selectedBooking = pendingBookings.find((booking) => booking._id === selectedBookingId);
  const amountDue = selectedBooking ? Math.max(0, selectedBooking.totalPrice - receivedForBooking(selectedBooking._id)) : 0;

  const summary = useMemo(() => {
    const paidPayments = payments.filter((payment) => payment.status === "received");
    const today = new Date();
    const todaysPayments = paidPayments.filter((payment) => {
      const paymentDate = new Date(payment.receivedAt);
      return paymentDate.getFullYear() === today.getFullYear()
        && paymentDate.getMonth() === today.getMonth()
        && paymentDate.getDate() === today.getDate();
    });
    return {
      pendingCount: pendingBookings.length,
      todaysTotal: todaysPayments.reduce((total, payment) => total + payment.amount, 0),
      totalCollected: paidPayments.reduce((total, payment) => total + payment.amount, 0),
      cashCollected: paidPayments.filter((payment) => payment.method === "cash").reduce((total, payment) => total + payment.amount, 0),
    };
  }, [payments, pendingBookings]);

  useEffect(() => {
    if (window.location.hash === "#record-payment") {
      document.getElementById("record-payment")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  async function submitPayment(event) {
    event.preventDefault();
    setErrorMessage("");
    setNotice("");

    if (!selectedBooking || amountDue <= 0) {
      setErrorMessage("Select a booking with an outstanding balance.");
      return;
    }
    if (["upi", "card"].includes(method) && !transactionReference.trim()) {
      setErrorMessage(`${method.toUpperCase()} transaction reference is required.`);
      return;
    }

    const confirmed = window.confirm(`Confirm payment of ₹${amountDue.toLocaleString("en-IN")} via ${method.toUpperCase()}?`);
    if (!confirmed) return;

    setSaving(true);
    try {
      await api.post("/payments", {
        bookingId: selectedBooking._id,
        amount: amountDue,
        method,
        transactionReference: transactionReference.trim(),
      });
      setSelectedBookingId("");
      setTransactionReference("");
      setMethod("cash");
      setNotice("Payment recorded successfully.");
      await loadPaymentData();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Could not record payment.");
    } finally {
      setSaving(false);
    }
  }

  function scrollToPayment(bookingId) {
    setSelectedBookingId(bookingId);
    document.getElementById("record-payment")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <Link className="text-sm font-semibold text-cyan-800 hover:underline" to={user.role === "admin" ? "/admin/dashboard" : "/"}>← Back to Dashboard</Link>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-800">{user.role === "customer" ? "Customer account" : `${user.role} workspace`}</p><h1 className="mt-1 text-3xl font-bold">Payments</h1><p className="mt-2 text-slate-600">{canRecordPayment ? "Record and manage customer rental payments." : "View your payment history and receipts."}</p></div>
          <Link className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50" to={user.role === "admin" ? "/admin/invoices" : user.role === "staff" ? "/staff/invoices" : "/customer/invoices"}>View invoices</Link>
        </div>
        <p className="mt-3 text-sm text-slate-500">Cash, UPI, and card receipts are recorded here. The system does not process online transactions.</p>

        {notice && <p className="mt-5 rounded-lg bg-emerald-50 p-3 text-emerald-800" role="status">{notice}</p>}
        {errorMessage && <p className="mt-5 rounded-lg bg-red-50 p-3 text-red-800" role="alert">{errorMessage}</p>}

        {canRecordPayment && (
          <>
            <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Payment summary">
              {[["Pending Payments", summary.pendingCount.toLocaleString("en-IN")], ["Today's Payments", `₹${summary.todaysTotal.toLocaleString("en-IN")}`], ["Total Collected", `₹${summary.totalCollected.toLocaleString("en-IN")}`], ["Cash Payments", `₹${summary.cashCollected.toLocaleString("en-IN")}`]].map(([label, value]) => <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" key={label}><p className="text-sm font-medium text-slate-600">{label}</p><p className="mt-2 text-2xl font-bold text-slate-950">{value}</p></article>)}
            </section>

            <section className="mt-8" aria-label="Pending payments">
              <h2 className="text-xl font-semibold">Pending payments</h2>
              {loading ? <p className="py-6 text-slate-600">Loading bookings…</p> : pendingBookings.length === 0 ? <p className="mt-4 rounded-xl border border-slate-200 bg-white p-5 text-slate-600">No approved bookings have an outstanding balance.</p> : (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {pendingBookings.map((booking) => {
                    const due = booking.totalPrice - receivedForBooking(booking._id);
                    return <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" key={booking._id}>
                      <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{booking.vehicle?.year} {booking.vehicle?.make} {booking.vehicle?.model}</h3><p className="mt-1 break-all text-xs text-slate-500">Booking {booking._id}</p></div><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">Pending</span></div>
                      <p className="mt-3 text-sm text-slate-600">{booking.customer?.name} · Amount due <strong className="text-slate-900">₹{due.toLocaleString("en-IN")}</strong></p>
                      <button className="mt-4 rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800" onClick={() => scrollToPayment(booking._id)} type="button">Record payment</button>
                    </article>;
                  })}
                </div>
              )}
            </section>

            <form className="mt-8 scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6" id="record-payment" onSubmit={submitPayment}>
              <h2 className="text-xl font-semibold">Record a payment</h2>
              <p className="mt-1 text-sm text-slate-600">The full outstanding booking amount is calculated from payment history.</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium sm:col-span-2">Booking
                  <select className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" required value={selectedBookingId} onChange={(event) => setSelectedBookingId(event.target.value)}>
                    <option value="">Choose a booking with a balance due</option>
                    {pendingBookings.map((booking) => <option key={booking._id} value={booking._id}>{booking.vehicle?.make} {booking.vehicle?.model} · {booking.customer?.name} · ₹{(booking.totalPrice - receivedForBooking(booking._id)).toLocaleString("en-IN")} due</option>)}
                  </select>
                </label>
                {selectedBooking && <p className="rounded-lg bg-slate-50 p-3 text-sm sm:col-span-2">Booking {selectedBooking._id} · {selectedBooking.customer?.name} · {selectedBooking.vehicle?.make} {selectedBooking.vehicle?.model} · Amount due ₹{amountDue.toLocaleString("en-IN")}</p>}
                <fieldset className="text-sm font-medium">
                  <legend>Payment method</legend>
                  <div className="mt-2 flex flex-wrap gap-4">
                    {["cash", "upi", "card"].map((paymentMethod) => <label className="flex items-center gap-2 font-normal" key={paymentMethod}><input checked={method === paymentMethod} name="paymentMethod" onChange={() => setMethod(paymentMethod)} type="radio" value={paymentMethod} />{paymentMethod.toUpperCase()}</label>)}
                  </div>
                </fieldset>
                <p className="text-sm text-slate-600">Payment date: {new Date().toLocaleString()}</p>
                {method !== "cash" && <label className="text-sm font-medium sm:col-span-2">Transaction reference<input className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" maxLength="100" required value={transactionReference} onChange={(event) => setTransactionReference(event.target.value)} /></label>}
                <button className="w-fit rounded-lg bg-cyan-700 px-5 py-2.5 font-semibold text-white hover:bg-cyan-800 disabled:opacity-60" disabled={saving || !selectedBooking} type="submit">{saving ? "Recording…" : "Record Payment"}</button>
              </div>
            </form>
          </>
        )}

        <section className="mt-8">
          <h2 className="text-xl font-semibold">Payment history</h2>
          {loading ? <p className="py-8 text-slate-600">Loading payments…</p> : payments.length === 0 ? <p className="mt-4 rounded-xl border border-slate-200 bg-white p-6 text-slate-600">No payment records yet.</p> : (
            <div className="mt-4 space-y-3">
              {payments.map((payment) => (
                <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" key={payment._id}>
                  <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                    <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Booking</p><p className="mt-1 break-all text-sm font-semibold">{payment.booking?._id}</p></div>
                      <div><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Customer / Vehicle</p><p className="mt-1 text-sm">{payment.customer?.name} · {payment.booking?.vehicle?.make} {payment.booking?.vehicle?.model}</p></div>
                      <div><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Amount / Method</p><p className="mt-1 text-sm font-semibold">₹{payment.amount.toLocaleString("en-IN")} · {payment.method.toUpperCase()}</p><p className="text-xs text-slate-600">{payment.status === "received" ? "Paid" : "Refunded"}</p></div>
                      <div><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Payment date / Recorded by</p><p className="mt-1 text-sm">{new Date(payment.receivedAt).toLocaleString()}</p><p className="text-xs text-slate-600">{payment.recordedBy?.name || "—"}</p>{payment.transactionReference && <p className="break-all text-xs text-slate-600">Ref: {payment.transactionReference}</p>}</div>
                    </div>
                    <Link className="shrink-0 text-sm font-semibold text-cyan-800 hover:underline" to={`/bookings/${payment.booking?._id}`}>View details →</Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default PaymentPage;
