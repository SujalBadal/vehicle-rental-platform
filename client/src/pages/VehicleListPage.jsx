import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

function VehicleListPage() {
  const [vehicles, setVehicles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({ search: "", category: "", transmission: "", fuelType: "", seats: "", minPrice: "", maxPrice: "", sort: "newest" });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    api.get("/categories").then((response) => setCategories(response.data.data.categories)).catch(() => {});
  }, []);

  useEffect(() => {
    let requestIsCurrent = true;

    async function loadVehicles() {
      setLoading(true);
      setErrorMessage("");

      try {
        const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
        const response = await api.get("/vehicles", { params });
        if (requestIsCurrent) setVehicles(response.data.data.vehicles);
      } catch (error) {
        if (requestIsCurrent) setErrorMessage(error.response?.data?.message || "Could not load vehicles.");
      } finally {
        if (requestIsCurrent) setLoading(false);
      }
    }

    loadVehicles();
    return () => {
      requestIsCurrent = false;
    };
  }, [filters]);

  function updateFilter(event) {
    setFilters((currentFilters) => ({ ...currentFilters, [event.target.name]: event.target.value }));
  }

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <Link className="text-sm font-semibold text-cyan-800 hover:underline" to="/">← Back to Dashboard</Link>
        <div className="mt-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-800">Browse the fleet</p>
            <h1 className="mt-2 text-3xl font-bold">Find a car for your next trip</h1>
          </div>
          <p className="text-sm text-slate-600">Only currently listed vehicles are shown.</p>
        </div>

        <section className="mt-7 grid gap-3 rounded-2xl bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
          <input className="rounded-lg border border-slate-300 px-3 py-2" name="search" placeholder="Search make or model" value={filters.search} onChange={updateFilter} />
          <select className="rounded-lg border border-slate-300 px-3 py-2" name="category" value={filters.category} onChange={updateFilter}>
            <option value="">All categories</option>
            {categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
          </select>
          <select className="rounded-lg border border-slate-300 px-3 py-2" name="transmission" value={filters.transmission} onChange={updateFilter}>
            <option value="">Any transmission</option><option value="automatic">Automatic</option><option value="manual">Manual</option>
          </select>
          <select className="rounded-lg border border-slate-300 px-3 py-2" name="fuelType" value={filters.fuelType} onChange={updateFilter}>
            <option value="">Any fuel</option><option value="petrol">Petrol</option><option value="diesel">Diesel</option><option value="hybrid">Hybrid</option><option value="electric">Electric</option><option value="other">Other</option>
          </select>
          <input className="rounded-lg border border-slate-300 px-3 py-2" name="seats" type="number" min="1" placeholder="At least this many seats" value={filters.seats} onChange={updateFilter} />
          <input className="rounded-lg border border-slate-300 px-3 py-2" name="minPrice" type="number" min="0" placeholder="Minimum price/day" value={filters.minPrice} onChange={updateFilter} />
          <input className="rounded-lg border border-slate-300 px-3 py-2" name="maxPrice" type="number" min="0" placeholder="Maximum price/day" value={filters.maxPrice} onChange={updateFilter} />
          <select className="rounded-lg border border-slate-300 px-3 py-2" name="sort" value={filters.sort} onChange={updateFilter}>
            <option value="newest">Newest</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option><option value="year_desc">Newest model year</option>
          </select>
        </section>

        {loading && <p className="py-12 text-center text-slate-600">Loading vehicles…</p>}
        {errorMessage && <p role="alert" className="mt-6 rounded-lg bg-red-50 p-4 text-red-800">{errorMessage}</p>}
        {!loading && !errorMessage && vehicles.length === 0 && <p className="mt-8 rounded-xl bg-white p-8 text-center text-slate-600">No vehicles match these filters.</p>}

        <section className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((vehicle) => (
            <article className="overflow-hidden rounded-2xl bg-white shadow-sm" key={vehicle._id}>
              {vehicle.images?.[0]?.url ? (
                <img className="h-52 w-full object-cover" src={vehicle.images[0].url} alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} />
              ) : (
                <div className="flex h-52 flex-col items-center justify-center bg-slate-100 text-slate-500" aria-label="Vehicle photo unavailable">
                  <span className="text-4xl" aria-hidden="true">🚘</span><span className="mt-2 text-xs font-medium uppercase tracking-wider">Vehicle image</span>
                </div>
              )}
              <div className="p-5">
                <p className="text-sm text-cyan-800">{vehicle.category?.name || "Vehicle"} · {vehicle.year}</p>
                <h2 className="mt-1 text-xl font-bold">{vehicle.make} {vehicle.model}</h2>
                <p className="mt-2 text-sm text-slate-600">{vehicle.transmission} · {vehicle.fuelType} · {vehicle.seats} seats</p>
                <div className="mt-5 flex items-center justify-between">
                  <p className="font-semibold">₹{vehicle.pricePerDay}<span className="font-normal text-slate-500"> / day</span></p>
                  <Link className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800" to={`/vehicles/${vehicle._id}`}>View details</Link>
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

export default VehicleListPage;
