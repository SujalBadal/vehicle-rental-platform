import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

function getTodayDate() {
  const today = new Date();
  const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
  return localToday.toISOString().slice(0, 10);
}

function VehicleDetailPage() {
  const { vehicleId } = useParams();
  const { user } = useAuth();
  const [vehicle, setVehicle] = useState(null);
  const [pickupDate, setPickupDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [checking, setChecking] = useState(false);
  const [booking, setBooking] = useState(null);
  const [bookingError, setBookingError] = useState("");
  const [bookingPending, setBookingPending] = useState(false);

  useEffect(() => {
    api.get(`/vehicles/${vehicleId}`)
      .then((response) => setVehicle(response.data.data.vehicle))
      .catch((error) => setErrorMessage(error.response?.data?.message || "Could not load this vehicle."))
      .finally(() => setLoading(false));
  }, [vehicleId]);

  async function checkAvailability(event) {
    event.preventDefault();
    setAvailability(null);
    setBooking(null);
    setErrorMessage("");
    setChecking(true);

    try {
      const response = await api.get(`/vehicles/${vehicleId}/availability`, {
        params: { pickupDate, returnDate },
      });
      setAvailability(response.data.data);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Could not check availability.");
    } finally {
      setChecking(false);
    }
  }

  async function requestBooking() {
    setBookingError("");
    setBookingPending(true);

    try {
      const response = await api.post("/bookings", { vehicleId, pickupDate, returnDate });
      setBooking(response.data.data.booking);
    } catch (error) {
      setBookingError(error.response?.data?.message || "Could not request this booking.");
    } finally {
      setBookingPending(false);
    }
  }

  if (loading) return <main className="p-10 text-center">Loading vehicle…</main>;

  if (!vehicle) {
    return <main className="mx-auto max-w-3xl p-10"><p role="alert" className="text-red-700">{errorMessage || "Vehicle not found."}</p><Link className="mt-4 inline-block text-cyan-800 underline" to="/vehicles">Back to vehicles</Link></main>;
  }

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-10 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <Link className="text-sm font-semibold text-cyan-800 hover:underline" to="/vehicles">← Browse vehicles</Link>
        <section className="mt-5 grid overflow-hidden rounded-2xl bg-white shadow-sm md:grid-cols-2">
          {vehicle.images?.[0]?.url ? (
            <img className="h-72 w-full object-cover md:h-full" src={vehicle.images[0].url} alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} />
          ) : (
            <div className="flex min-h-72 flex-col items-center justify-center bg-slate-100 text-slate-500" aria-label="Vehicle photo unavailable">
              <span className="text-6xl" aria-hidden="true">🚘</span><span className="mt-3 text-xs font-medium uppercase tracking-wider">Vehicle image</span>
            </div>
          )}
          <div className="p-7 md:p-9">
            <p className="text-sm font-semibold text-cyan-800">{vehicle.category?.name} · {vehicle.year}</p>
            <h1 className="mt-2 text-3xl font-bold">{vehicle.make} {vehicle.model}</h1>
            <p className="mt-4 text-slate-600">{vehicle.description || "A well-maintained vehicle, ready for your next journey."}</p>
            <p className="mt-5 font-semibold">₹{vehicle.pricePerDay} <span className="font-normal text-slate-500">per day</span></p>
            <p className="mt-3 text-sm text-slate-600">{vehicle.transmission} · {vehicle.fuelType} · {vehicle.seats} seats</p>

            <form className="mt-8 space-y-4 border-t border-slate-200 pt-6" onSubmit={checkAvailability}>
              <h2 className="text-lg font-semibold">Check your dates</h2>
              <label className="block text-sm font-medium">Pickup date<input className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" type="date" min={getTodayDate()} required value={pickupDate} onChange={(event) => { setPickupDate(event.target.value); setAvailability(null); setBooking(null); }} /></label>
              <label className="block text-sm font-medium">Return date<input className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" type="date" min={pickupDate || getTodayDate()} required value={returnDate} onChange={(event) => { setReturnDate(event.target.value); setAvailability(null); setBooking(null); }} /></label>
              <button className="w-full rounded-lg bg-cyan-700 px-4 py-3 font-semibold text-white hover:bg-cyan-800 disabled:opacity-60" disabled={checking} type="submit">{checking ? "Checking…" : "Check availability"}</button>
              {availability && <p className={`rounded-lg p-3 text-sm ${availability.available ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`} role="status">{availability.available ? "This car is available for those dates." : `This car is unavailable. ${availability.reason || "Choose different dates."}`}</p>}
              {availability?.available && user?.role === "customer" && !booking && <button className="w-full rounded-lg bg-cyan-700 px-4 py-3 font-semibold text-white hover:bg-cyan-800 disabled:opacity-60" disabled={bookingPending} onClick={requestBooking} type="button">{bookingPending ? "Sending request…" : "Request booking"}</button>}
              {availability?.available && !user && <Link className="block text-center text-sm font-semibold text-cyan-800 hover:underline" to="/login">Sign in to request this car</Link>}
              {booking && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800" role="status">Booking request submitted. <Link className="font-semibold underline" to={`/bookings/${booking._id}`}>View booking</Link></p>}
              {bookingError && <p className="text-sm text-red-700" role="alert">{bookingError}</p>}
              {errorMessage && <p className="text-sm text-red-700" role="alert">{errorMessage}</p>}
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

export default VehicleDetailPage;
