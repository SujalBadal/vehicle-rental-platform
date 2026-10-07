import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

function InvoicePage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [eligibleBookings, setEligibleBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");

  async function loadInvoices() {
    setLoading(true);
    setErrorMessage("");
    try {
      const [invoiceResponse, bookingResponse, paymentResponse] = await Promise.all([
        api.get("/invoices"),
        api.get("/bookings"),
        api.get("/payments"),
      ]);

      setInvoices(invoiceResponse.data.data.invoices);
      setPayments(paymentResponse.data.data.payments);
      setEligibleBookings(bookingResponse.data.data.bookings.filter((booking) => ["approved", "completed"].includes(booking.status)));
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Could not load invoices.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInvoices();
  }, []);

  function isBookingFullyPaid(booking) {
    const paidAmount = payments
      .filter((payment) => payment.booking?._id === booking._id && payment.status === "received")
      .reduce((total, payment) => total + payment.amount, 0);

    return paidAmount + 0.000001 >= booking.totalPrice;
  }

  async function generateInvoice(bookingId) {
    setWorkingId(bookingId);
    setErrorMessage("");
    setNotice("");
    try {
      await api.post(`/invoices/bookings/${bookingId}`);
      setNotice("Invoice generated.");
      await loadInvoices();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Could not generate invoice.");
    } finally {
      setWorkingId("");
    }
  }

  async function downloadInvoice(invoice) {
    setWorkingId(invoice._id);
    setErrorMessage("");
    try {
      const response = await api.get(`/invoices/${invoice._id}/pdf`, { responseType: "blob" });
      const fileUrl = URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const downloadLink = document.createElement("a");
      downloadLink.href = fileUrl;
      downloadLink.download = `${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      window.setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
    } catch (error) {
      setErrorMessage("Could not download invoice PDF.");
    } finally {
      setWorkingId("");
    }
  }

  const invoiceBookingIds = new Set(invoices.map((invoice) => invoice.booking?._id || invoice.booking));
  const eligibleToInvoice = eligibleBookings.filter((booking) => isBookingFullyPaid(booking) && !invoiceBookingIds.has(booking._id));

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-10 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <Link className="text-sm font-semibold text-cyan-800 hover:underline" to={user.role === "admin" ? "/admin/dashboard" : "/"}>← Back to Dashboard</Link>
        <h1 className="mt-5 text-3xl font-bold">Invoices</h1>
        <p className="mt-2 text-slate-600">Generate a PDF invoice after the full booking amount has been recorded as received.</p>
        {notice && <p className="mt-5 rounded-lg bg-emerald-50 p-3 text-emerald-800" role="status">{notice}</p>}
        {errorMessage && <p className="mt-5 rounded-lg bg-red-50 p-3 text-red-800" role="alert">{errorMessage}</p>}

        {loading ? <p className="py-10 text-center text-slate-600">Loading invoices…</p> : (
          <>
            {eligibleToInvoice.length > 0 && <section className="mt-7">
              <h2 className="text-xl font-semibold">Paid bookings without an invoice</h2>
              <div className="mt-4 space-y-3">
                {eligibleToInvoice.map((booking) => (
                  <article className="flex flex-col justify-between gap-3 rounded-xl bg-white p-5 shadow-sm sm:flex-row sm:items-center" key={booking._id}>
                    <div><h3 className="font-semibold">{booking.vehicle?.make} {booking.vehicle?.model}</h3><p className="mt-1 text-sm text-slate-600">{new Date(booking.pickupDate).toLocaleDateString()} – {new Date(booking.returnDate).toLocaleDateString()} · ₹{booking.totalPrice}</p>{user.role !== "customer" && <p className="mt-1 text-sm text-slate-600">{booking.customer?.name}</p>}</div>
                    <button className="rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-60" disabled={workingId === booking._id} onClick={() => generateInvoice(booking._id)} type="button">{workingId === booking._id ? "Generating…" : "Generate invoice"}</button>
                  </article>
                ))}
              </div>
            </section>}

            <section className="mt-8">
              <h2 className="text-xl font-semibold">Available invoices</h2>
              {invoices.length === 0 ? <p className="mt-4 rounded-xl bg-white p-6 text-slate-600">No invoices available yet. A booking must be fully paid first.</p> : (
                <div className="mt-4 space-y-3">
                  {invoices.map((invoice) => (
                    <article className="flex flex-col justify-between gap-3 rounded-xl bg-white p-5 shadow-sm sm:flex-row sm:items-center" key={invoice._id}>
                      <div><h3 className="font-semibold">{invoice.invoiceNumber}</h3><p className="mt-1 text-sm text-slate-600">Issued {new Date(invoice.issuedAt).toLocaleDateString()} · ₹{invoice.amount}</p>{user.role !== "customer" && <p className="mt-1 text-sm text-slate-600">{invoice.customer?.name}</p>}</div>
                      <button className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60" disabled={workingId === invoice._id} onClick={() => downloadInvoice(invoice)} type="button">{workingId === invoice._id ? "Preparing…" : "Download PDF"}</button>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

export default InvoicePage;
