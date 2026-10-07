import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import api from "../services/api";

function RentalManagementPage() {
  const location = useLocation();
  const [approvedBookings, setApprovedBookings] = useState([]);
  const [activeRentals, setActiveRentals] = useState([]);
  const [pickupForms, setPickupForms] = useState({});
  const [returnForms, setReturnForms] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");

  async function loadRentalWork() {
    setLoading(true);
    setErrorMessage("");
    try {
      const [bookingResponse, rentalResponse] = await Promise.all([
        api.get("/bookings", { params: { status: "approved" } }),
        api.get("/rentals", { params: { status: "active" } }),
      ]);
      setApprovedBookings(bookingResponse.data.data.bookings);
      setActiveRentals(rentalResponse.data.data.rentals);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Could not load pickup and return work.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRentalWork();
  }, []);

  useEffect(() => {
    if (location.hash === "#vehicle-returns" && !loading) {
      document.getElementById("vehicle-returns")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [location.hash, loading]);

  function setPickupField(bookingId, fieldName, value) {
    setPickupForms((current) => ({
      ...current,
      [bookingId]: { ...current[bookingId], [fieldName]: value },
    }));
  }

  function setReturnField(rentalId, fieldName, value) {
    setReturnForms((current) => ({
      ...current,
      [rentalId]: { ...current[rentalId], [fieldName]: value },
    }));
  }

  async function recordPickup(bookingId) {
    const pickupForm = pickupForms[bookingId] || {};
    if (pickupForm.odometer === undefined || pickupForm.odometer === "") {
      setErrorMessage("Enter the pickup odometer reading first.");
      return;
    }

    setErrorMessage("");
    setNotice("");
    setSavingId(bookingId);
    try {
      await api.post(`/rentals/bookings/${bookingId}/pickup`, {
        pickupOdometer: Number(pickupForm.odometer),
        pickupConditionNotes: pickupForm.notes,
      });
      setNotice("Pickup recorded. The vehicle is now marked as rented.");
      await loadRentalWork();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Could not record pickup.");
    } finally {
      setSavingId("");
    }
  }

  async function recordReturn(rentalId) {
    const returnForm = returnForms[rentalId] || {};
    if (returnForm.odometer === undefined || returnForm.odometer === "") {
      setErrorMessage("Enter the return odometer reading first.");
      return;
    }

    setErrorMessage("");
    setNotice("");
    setSavingId(rentalId);
    try {
      await api.patch(`/rentals/${rentalId}/return`, {
        returnOdometer: Number(returnForm.odometer),
        returnConditionNotes: returnForm.notes,
        damageReported: Boolean(returnForm.damageReported),
        damageNotes: returnForm.damageNotes,
      });
      setNotice(returnForm.damageReported ? "Return recorded. Vehicle is marked for maintenance." : "Return recorded. Vehicle is available again.");
      await loadRentalWork();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Could not record return.");
    } finally {
      setSavingId("");
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <Link className="text-sm font-semibold text-cyan-800 hover:underline" to={location.pathname.startsWith("/admin/") ? "/admin/dashboard" : "/staff/dashboard"}>
          ← Back to Dashboard
        </Link>
        <h1 className="mt-5 text-3xl font-bold">Vehicle pickups and returns</h1>
        <p className="mt-2 text-slate-600">Record odometer readings and condition notes at both handoffs.</p>

        {notice && <p className="mt-5 rounded-lg bg-emerald-50 p-3 text-emerald-800" role="status">{notice}</p>}
        {errorMessage && <p className="mt-5 rounded-lg bg-red-50 p-3 text-red-800" role="alert">{errorMessage}</p>}
        {loading && <p className="py-10 text-center text-slate-600">Loading rental work…</p>}

        {!loading && (
          <>
            <section className="mt-8">
              <h2 className="text-xl font-semibold">Approved bookings awaiting pickup</h2>
              {approvedBookings.length === 0 ? <p className="mt-3 rounded-xl bg-white p-5 text-slate-600">No approved bookings are waiting for pickup.</p> : (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {approvedBookings.map((booking) => (
                    <article className="rounded-xl bg-white p-5 shadow-sm" key={booking._id}>
                      <h3 className="font-semibold">{booking.vehicle?.year} {booking.vehicle?.make} {booking.vehicle?.model}</h3>
                      <p className="mt-1 text-sm text-slate-600">{booking.customer?.name} · Pickup {new Date(booking.pickupDate).toLocaleDateString()}</p>
                      <label className="mt-4 block text-sm font-medium">Pickup odometer (km)<input className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" type="number" min="0" step="0.1" value={pickupForms[booking._id]?.odometer || ""} onChange={(event) => setPickupField(booking._id, "odometer", event.target.value)} /></label>
                      <label className="mt-3 block text-sm font-medium">Pickup condition notes<textarea className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" rows="2" value={pickupForms[booking._id]?.notes || ""} onChange={(event) => setPickupField(booking._id, "notes", event.target.value)} /></label>
                      <button className="mt-4 rounded-lg bg-cyan-700 px-4 py-2.5 font-semibold text-white hover:bg-cyan-800 disabled:opacity-60" disabled={savingId === booking._id} onClick={() => recordPickup(booking._id)} type="button">{savingId === booking._id ? "Saving…" : "Record pickup"}</button>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="mt-10 scroll-mt-24" id="vehicle-returns">
              <h2 className="text-xl font-semibold">Active rentals</h2>
              {activeRentals.length === 0 ? <p className="mt-3 rounded-xl bg-white p-5 text-slate-600">There are no active rentals.</p> : (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {activeRentals.map((rental) => (
                    <article className="rounded-xl bg-white p-5 shadow-sm" key={rental._id}>
                      <h3 className="font-semibold">{rental.vehicle?.year} {rental.vehicle?.make} {rental.vehicle?.model}</h3>
                      <p className="mt-1 text-sm text-slate-600">{rental.customer?.name} · Picked up {new Date(rental.pickedUpAt).toLocaleString()}</p>
                      <p className="mt-1 text-sm text-slate-600">Pickup reading: {rental.pickupOdometer} km</p>
                      <label className="mt-4 block text-sm font-medium">Return odometer (km)<input className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" type="number" min={rental.pickupOdometer} step="0.1" value={returnForms[rental._id]?.odometer || ""} onChange={(event) => setReturnField(rental._id, "odometer", event.target.value)} /></label>
                      <label className="mt-3 block text-sm font-medium">Return condition notes<textarea className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" rows="2" value={returnForms[rental._id]?.notes || ""} onChange={(event) => setReturnField(rental._id, "notes", event.target.value)} /></label>
                      <label className="mt-3 flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={Boolean(returnForms[rental._id]?.damageReported)} onChange={(event) => setReturnField(rental._id, "damageReported", event.target.checked)} />Damage reported</label>
                      {returnForms[rental._id]?.damageReported && <label className="mt-3 block text-sm font-medium">Damage notes<textarea className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" rows="2" value={returnForms[rental._id]?.damageNotes || ""} onChange={(event) => setReturnField(rental._id, "damageNotes", event.target.value)} /></label>}
                      <button className="mt-4 rounded-lg bg-cyan-700 px-4 py-2.5 font-semibold text-white hover:bg-cyan-800 disabled:opacity-60" disabled={savingId === rental._id} onClick={() => recordReturn(rental._id)} type="button">{savingId === rental._id ? "Saving…" : "Record return"}</button>
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

export default RentalManagementPage;
