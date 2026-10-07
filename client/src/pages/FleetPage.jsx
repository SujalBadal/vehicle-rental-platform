import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const emptyVehicle = {
  category: "",
  make: "",
  model: "",
  year: "",
  registrationNumber: "",
  description: "",
  transmission: "automatic",
  fuelType: "petrol",
  seats: 5,
  pricePerDay: "",
  status: "available",
};

function FleetPage() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [pageError, setPageError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: emptyVehicle });

  async function loadFleet() {
    setLoading(true);
    setPageError("");

    try {
      const [vehicleResponse, categoryResponse] = await Promise.all([
        api.get("/vehicles", { params: { includeUnavailable: true, limit: 50 } }),
        api.get("/categories", { params: user.role === "admin" ? { includeInactive: true } : {} }),
      ]);
      setVehicles(vehicleResponse.data.data.vehicles);
      setCategories(categoryResponse.data.data.categories);
    } catch (error) {
      setPageError(error.response?.data?.message || "Could not load the fleet.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFleet();
  }, []);

  function startEditing(vehicle) {
    setEditingVehicle(vehicle);
    setMessage("");
    setPageError("");
    reset({
      ...vehicle,
      category: vehicle.category?._id || vehicle.category,
      images: undefined,
    });
  }

  function clearForm() {
    setEditingVehicle(null);
    reset(emptyVehicle);
  }

  async function saveVehicle(formData) {
    setMessage("");
    setPageError("");
    const selectedImages = formData.images;
    const vehicleDetails = { ...formData };
    delete vehicleDetails.images;

    let savedVehicle;

    try {
      if (editingVehicle) {
        const response = await api.put(`/vehicles/${editingVehicle._id}`, vehicleDetails);
        savedVehicle = response.data.data.vehicle;
      } else {
        const response = await api.post("/vehicles", vehicleDetails);
        savedVehicle = response.data.data.vehicle;
      }
    } catch (error) {
      const responseErrors = error.response?.data?.errors || [];
      setPageError(error.response?.data?.message || "Could not save this vehicle.");
      if (responseErrors.length) {
        setError("root.server", { message: responseErrors.join(" ") });
      }
      return;
    }

    const wasEditing = Boolean(editingVehicle);
    setVehicles((currentVehicles) => (
      wasEditing
        ? currentVehicles.map((vehicle) => vehicle._id === savedVehicle._id ? savedVehicle : vehicle)
        : [savedVehicle, ...currentVehicles]
    ));
    clearForm();
    setMessage(wasEditing ? "Vehicle updated." : "Vehicle added.");

    if (selectedImages?.length) {
      const form = new FormData();
      Array.from(selectedImages).forEach((imageFile) => form.append("images", imageFile));

      try {
        const imageResponse = await api.post(
          `/vehicles/${savedVehicle._id}/images${wasEditing ? "?replace=true" : ""}`,
          form,
        );
        const updatedVehicle = {
          ...imageResponse.data.data.vehicle,
          category: savedVehicle.category,
        };
        setVehicles((currentVehicles) => currentVehicles.map((vehicle) => (
          vehicle._id === updatedVehicle._id ? updatedVehicle : vehicle
        )));
        setMessage(imageResponse.data.message || (wasEditing ? "Vehicle updated and images uploaded." : "Vehicle added and images uploaded."));
      } catch (error) {
        setMessage("");
        setPageError(error.response?.data?.message || "Vehicle was saved, but its images could not be uploaded.");
      }
    }
  }

  async function deleteVehicle(vehicle) {
    const shouldDelete = window.confirm(`Delete ${vehicle.make} ${vehicle.model}?`);
    if (!shouldDelete) return;

    setPageError("");
    setMessage("");
    try {
      await api.delete(`/vehicles/${vehicle._id}`);
      setMessage("Vehicle deleted.");
      await loadFleet();
    } catch (error) {
      setPageError(error.response?.data?.message || "Could not delete this vehicle.");
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <Link className="text-sm font-semibold text-cyan-800 hover:underline" to={user.role === "admin" ? "/admin/dashboard" : "/staff/dashboard"}>
          ← Back to Dashboard
        </Link>
        <h1 className="mt-5 text-3xl font-bold">Vehicle fleet</h1>
        <p className="mt-2 text-slate-600">Add and update vehicles. Images upload to Cloudinary when it is configured.</p>

        <section className="mt-7 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">{editingVehicle ? "Edit vehicle" : "Add a vehicle"}</h2>
          <form className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" onSubmit={handleSubmit(saveVehicle)}>
            <label className="text-sm font-medium">Category
              <select className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" {...register("category", { required: "Choose a category." })}>
                <option value="">Choose category</option>
                {categories.filter((category) => category.isActive).map((category) => <option value={category._id} key={category._id}>{category.name}</option>)}
              </select>
              {errors.category && <span className="text-red-700">{errors.category.message}</span>}
            </label>
            <label className="text-sm font-medium">Make<input className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" {...register("make", { required: "Enter the make." })} />{errors.make && <span className="text-red-700">{errors.make.message}</span>}</label>
            <label className="text-sm font-medium">Model<input className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" {...register("model", { required: "Enter the model." })} />{errors.model && <span className="text-red-700">{errors.model.message}</span>}</label>
            <label className="text-sm font-medium">Year<input className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" type="number" min="1900" max="2100" {...register("year", { required: "Enter the model year.", valueAsNumber: true, min: 1900, max: 2100 })} /></label>
            <label className="text-sm font-medium">Registration number<input className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" {...register("registrationNumber", { required: "Enter the registration number." })} /></label>
            <label className="text-sm font-medium">Price per day (₹)<input className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" type="number" min="0" step="0.01" {...register("pricePerDay", { required: "Enter the daily price.", valueAsNumber: true, min: 0 })} /></label>
            <label className="text-sm font-medium">Seats<input className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" type="number" min="1" max="50" {...register("seats", { required: "Enter the seat count.", valueAsNumber: true, min: 1, max: 50 })} /></label>
            <label className="text-sm font-medium">Transmission<select className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" {...register("transmission", { required: true })}><option value="automatic">Automatic</option><option value="manual">Manual</option></select></label>
            <label className="text-sm font-medium">Fuel type<select className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" {...register("fuelType", { required: true })}><option value="petrol">Petrol</option><option value="diesel">Diesel</option><option value="hybrid">Hybrid</option><option value="electric">Electric</option><option value="other">Other</option></select></label>
            <label className="text-sm font-medium">Status<select className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" {...register("status", { required: true })}><option value="available">Available</option><option value="maintenance">Maintenance</option><option value="rented">Rented</option><option value="inactive">Inactive</option></select></label>
            <label className="text-sm font-medium sm:col-span-2">Description<textarea className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" rows="2" {...register("description")} /></label>
            <label className="text-sm font-medium">Images (JPG, PNG, WebP; up to 5)<input className="mt-1 block w-full text-sm" type="file" accept="image/jpeg,image/png,image/webp" multiple {...register("images")} /></label>
            {errors.root?.server && <p className="text-sm text-red-700 sm:col-span-2">{errors.root.server.message}</p>}
            <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-3">
              <button className="rounded-lg bg-cyan-700 px-5 py-2.5 font-semibold text-white hover:bg-cyan-800 disabled:opacity-60" disabled={isSubmitting} type="submit">{isSubmitting ? "Saving…" : editingVehicle ? "Save changes" : "Add vehicle"}</button>
              {editingVehicle && <button className="rounded-lg border border-slate-300 px-5 py-2.5 font-semibold" type="button" onClick={clearForm}>Cancel edit</button>}
            </div>
          </form>
        </section>

        {message && <p className="mt-5 rounded-lg bg-emerald-50 p-3 text-emerald-800" role="status">{message}</p>}
        {pageError && <p className="mt-5 rounded-lg bg-red-50 p-3 text-red-800" role="alert">{pageError}</p>}
        <section className="mt-8">
          <h2 className="text-xl font-semibold">Current vehicles</h2>
          {loading ? <p className="py-8 text-slate-600">Loading fleet…</p> : vehicles.length === 0 ? <p className="mt-4 rounded-xl bg-white p-6 text-slate-600">No vehicles have been added yet.</p> : (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {vehicles.map((vehicle) => (
                <article className="flex gap-4 rounded-xl bg-white p-4 shadow-sm" key={vehicle._id}>
                  {vehicle.images?.[0]?.url ? <img className="h-24 w-32 rounded-lg object-cover" src={vehicle.images[0].url} alt={`${vehicle.make} ${vehicle.model}`} /> : <div className="flex h-24 w-32 items-center justify-center rounded-lg bg-slate-200 text-center text-xs text-slate-500">No photo</div>}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">{vehicle.year} {vehicle.make} {vehicle.model}</h3>
                    <p className="mt-1 text-sm text-slate-600">{vehicle.category?.name} · ₹{vehicle.pricePerDay}/day</p>
                    <p className="mt-1 text-sm capitalize text-slate-600">{vehicle.status}</p>
                    <div className="mt-3 flex gap-3">
                      <button className="text-sm font-semibold text-cyan-800 hover:underline" type="button" onClick={() => startEditing(vehicle)}>Edit</button>
                      {user.role === "admin" && <button className="text-sm font-semibold text-red-700 hover:underline" type="button" onClick={() => deleteVehicle(vehicle)}>Delete</button>}
                    </div>
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

export default FleetPage;
