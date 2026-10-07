import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import api from "../services/api";

function CategoryManagementPage() {
  const [categories, setCategories] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm();

  async function loadCategories() {
    try {
      const response = await api.get("/categories", { params: { includeInactive: true } });
      setCategories(response.data.data.categories);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Could not load categories.");
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  async function createCategory(formData) {
    setErrorMessage("");
    setNotice("");
    try {
      await api.post("/categories", formData);
      reset();
      setNotice("Category created.");
      await loadCategories();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Could not create category.");
    }
  }

  async function changeCategoryStatus(category) {
    setErrorMessage("");
    setNotice("");
    try {
      await api.put(`/categories/${category._id}`, { isActive: !category.isActive });
      setNotice(`Category ${category.isActive ? "deactivated" : "activated"}.`);
      await loadCategories();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Could not update category.");
    }
  }

  async function deleteCategory(category) {
    const shouldDelete = window.confirm(`Delete category “${category.name}”?`);
    if (!shouldDelete) return;

    setErrorMessage("");
    setNotice("");
    try {
      await api.delete(`/categories/${category._id}`);
      setNotice("Category deleted.");
      await loadCategories();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Could not delete category.");
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-10 text-slate-900">
      <div className="mx-auto max-w-4xl">
        <Link className="text-sm font-semibold text-cyan-800 hover:underline" to="/admin/dashboard">← Back to Dashboard</Link>
        <h1 className="mt-5 text-3xl font-bold">Vehicle categories</h1>
        <p className="mt-2 text-slate-600">Categories help customers narrow their vehicle search.</p>

        <form className="mt-7 grid gap-4 rounded-2xl bg-white p-6 shadow-sm sm:grid-cols-2" onSubmit={handleSubmit(createCategory)}>
          <label className="text-sm font-medium">Category name<input className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" {...register("name", { required: "Enter a category name." })} />{errors.name && <span className="text-red-700">{errors.name.message}</span>}</label>
          <label className="text-sm font-medium">Description (optional)<input className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" {...register("description")} /></label>
          <button className="w-fit rounded-lg bg-cyan-700 px-5 py-2.5 font-semibold text-white hover:bg-cyan-800 disabled:opacity-60" disabled={isSubmitting} type="submit">Add category</button>
        </form>

        {notice && <p className="mt-5 rounded-lg bg-emerald-50 p-3 text-emerald-800" role="status">{notice}</p>}
        {errorMessage && <p className="mt-5 rounded-lg bg-red-50 p-3 text-red-800" role="alert">{errorMessage}</p>}

        <section className="mt-8 space-y-3">
          {categories.map((category) => (
            <article className="flex flex-col justify-between gap-3 rounded-xl bg-white p-5 shadow-sm sm:flex-row sm:items-center" key={category._id}>
              <div><h2 className="font-semibold">{category.name} {!category.isActive && <span className="text-xs font-normal text-slate-500">(inactive)</span>}</h2><p className="mt-1 text-sm text-slate-600">{category.description || "No description"}</p></div>
              <div className="flex gap-4">
                <button className="text-sm font-semibold text-cyan-800 hover:underline" type="button" onClick={() => changeCategoryStatus(category)}>{category.isActive ? "Deactivate" : "Activate"}</button>
                <button className="text-sm font-semibold text-red-700 hover:underline" type="button" onClick={() => deleteCategory(category)}>Delete</button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

export default CategoryManagementPage;
