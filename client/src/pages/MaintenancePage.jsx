import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import api from "../services/api";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";

function MaintenancePage() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { cost: 0 } });

  async function loadRecords() {
    setLoading(true);
    try {
      const [maintenanceResponse, vehicleResponse] = await Promise.all([
        api.get("/maintenance"),
        api.get("/vehicles", { params: { includeUnavailable: true, limit: 50 } }),
      ]);
      setRecords(maintenanceResponse.data.data.maintenance);
      setVehicles(vehicleResponse.data.data.vehicles);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Could not load maintenance records.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecords();
  }, []);

  async function scheduleMaintenance(formData) {
    setErrorMessage("");
    setNotice("");
    try {
      await api.post("/maintenance", {
        ...formData,
        cost: Number(formData.cost || 0),
        scheduledAt: new Date(formData.scheduledAt).toISOString(),
      });
      reset({ vehicleId: "", serviceType: "", scheduledAt: "", description: "", cost: 0, notes: "" });
      setNotice("Maintenance scheduled. The vehicle is now unavailable.");
      await loadRecords();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Could not schedule maintenance.");
    }
  }

  async function changeRecordStatus(record, action) {
    setSavingId(record._id);
    setErrorMessage("");
    setNotice("");

    try {
      if (action === "start") {
        await api.patch(`/maintenance/${record._id}/start`);
      } else if (action === "complete") {
        const cost = window.prompt("Enter the final maintenance cost:", String(record.cost || 0));
        if (cost === null) return;
        await api.patch(`/maintenance/${record._id}/complete`, { cost: Number(cost) });
      } else {
        await api.patch(`/maintenance/${record._id}/cancel`);
      }

      setNotice(action === "cancel" ? "Maintenance cancelled." : `Maintenance ${action === "start" ? "started" : "completed"}.`);
      await loadRecords();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || `Could not ${action} maintenance.`);
    } finally {
      setSavingId("");
    }
  }

  const schedulableVehicles = vehicles.filter((vehicle) => ["available", "maintenance"].includes(vehicle.status));

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-10 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <Link className="text-sm font-semibold text-cyan-800 hover:underline" to={user.role === "admin" ? "/admin/dashboard" : "/staff/dashboard"}>
          ← Back to Dashboard
        </Link>
        <h1 className="mt-5 text-3xl font-bold">Maintenance</h1>
        <p className="mt-2 text-slate-600">Scheduling makes a vehicle unavailable immediately, so it cannot be booked while service is open.</p>

        <form className="mt-7 grid gap-4 rounded-2xl bg-white p-6 shadow-sm sm:grid-cols-2" onSubmit={handleSubmit(scheduleMaintenance)}>
          <label className="text-sm font-medium">Vehicle<select className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" {...register("vehicleId", { required: "Choose a vehicle." })}><option value="">Choose vehicle</option>{schedulableVehicles.map((vehicle) => <option key={vehicle._id} value={vehicle._id}>{vehicle.make} {vehicle.model} · {vehicle.status}</option>)}</select>{errors.vehicleId && <span className="text-red-700">{errors.vehicleId.message}</span>}</label>
          <label className="text-sm font-medium">Service type<input className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" maxLength="100" placeholder="Regular service" {...register("serviceType", { required: "Enter a service type." })} />{errors.serviceType && <span className="text-red-700">{errors.serviceType.message}</span>}</label>
          <label className="text-sm font-medium">Scheduled date/time<input className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" type="datetime-local" {...register("scheduledAt", { required: "Choose a schedule date." })} />{errors.scheduledAt && <span className="text-red-700">{errors.scheduledAt.message}</span>}</label>
          <label className="text-sm font-medium sm:col-span-2">Work description<input className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" maxLength="1000" {...register("description", { required: "Describe the work." })} />{errors.description && <span className="text-red-700">{errors.description.message}</span>}</label>
          <label className="text-sm font-medium">Estimated cost (₹)<input className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" type="number" min="0" step="0.01" {...register("cost", { valueAsNumber: true, min: 0 })} /></label>
          <label className="text-sm font-medium">Notes (optional)<input className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" maxLength="2000" {...register("notes")} /></label>
          <button className="w-fit rounded-lg bg-cyan-700 px-5 py-2.5 font-semibold text-white hover:bg-cyan-800 disabled:opacity-60" disabled={isSubmitting} type="submit">{isSubmitting ? "Scheduling…" : "Schedule maintenance"}</button>
        </form>

        {notice && <p className="mt-5 rounded-lg bg-emerald-50 p-3 text-emerald-800" role="status">{notice}</p>}
        {errorMessage && <p className="mt-5 rounded-lg bg-red-50 p-3 text-red-800" role="alert">{errorMessage}</p>}

        <section className="mt-8">
          <h2 className="text-xl font-semibold">Service history</h2>
          {loading ? <p className="py-8 text-slate-600">Loading records…</p> : records.length === 0 ? <p className="mt-4 rounded-xl bg-white p-6 text-slate-600">No maintenance records yet.</p> : (
            <div className="mt-4 space-y-3">
              {records.map((record) => (
                <article className="rounded-xl bg-white p-5 shadow-sm" key={record._id}>
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div><h3 className="font-semibold">{record.vehicle?.year} {record.vehicle?.make} {record.vehicle?.model} · {record.serviceType || "Service"}</h3><p className="mt-1 text-slate-700">{record.description}</p><p className="mt-1 text-sm text-slate-600">Scheduled {new Date(record.scheduledAt).toLocaleString()} · Cost ₹{record.cost}</p>{record.performedBy?.name && <p className="mt-1 text-sm text-slate-600">Performed by {record.performedBy.name}</p>}{record.notes && <p className="mt-1 text-sm text-slate-600">{record.notes}</p>}</div>
                    <StatusBadge status={record.status} />
                  </div>
                  {record.status === "scheduled" && <div className="mt-4 flex gap-4"><button className="text-sm font-semibold text-cyan-800 hover:underline" disabled={savingId === record._id} onClick={() => changeRecordStatus(record, "start")} type="button">Start work</button><button className="text-sm font-semibold text-red-700 hover:underline" disabled={savingId === record._id} onClick={() => changeRecordStatus(record, "cancel")} type="button">Cancel</button></div>}
                  {record.status === "in_progress" && <div className="mt-4 flex gap-4"><button className="text-sm font-semibold text-emerald-800 hover:underline" disabled={savingId === record._id} onClick={() => changeRecordStatus(record, "complete")} type="button">Complete work</button><button className="text-sm font-semibold text-red-700 hover:underline" disabled={savingId === record._id} onClick={() => changeRecordStatus(record, "cancel")} type="button">Cancel</button></div>}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default MaintenancePage;
