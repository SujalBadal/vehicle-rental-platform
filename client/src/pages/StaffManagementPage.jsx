import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import api from "../services/api";
import PasswordInput from "../components/PasswordInput";

const inputClass = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 pr-16 focus:border-cyan-600 focus:outline-none";

function ManagedUserRow({ user, onUpdated }) {
  const [errorMessage, setErrorMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, reset } = useForm({ defaultValues: { name: user.name, mobile: user.mobile || "" } });

  useEffect(() => reset({ name: user.name, mobile: user.mobile || "" }), [user, reset]);

  async function saveDetails(formData) {
    setSaving(true);
    setErrorMessage("");
    try {
      await api.patch(`/users/${user._id}`, formData);
      onUpdated();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Could not update this account.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus() {
    setSaving(true);
    setErrorMessage("");
    try {
      await api.patch(`/users/${user._id}/status`, { isActive: !user.isActive });
      onUpdated();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Could not update account status.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{user.name}</h3>
          <p className="mt-1 text-sm text-slate-600">{user.email}</p>
          <p className="mt-1 text-sm text-slate-600">{user.mobile || "Phone number not set"} · <span className="capitalize">{user.role}</span> · {user.isActive ? "Active" : "Inactive"}</p>
        </div>
        <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60" disabled={saving} onClick={toggleStatus} type="button">
          {user.isActive ? "Deactivate account" : "Activate account"}
        </button>
      </div>
      <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={handleSubmit(saveDetails)}>
        <label className="text-sm font-medium">Name *<input className={inputClass} {...register("name", { required: true })} /></label>
        <label className="text-sm font-medium">Phone Number *<input className={inputClass} type="tel" {...register("mobile", { required: true, setValueAs: (value) => value.trim().replace(/[\s-]/g, ""), validate: (value) => /^[6-9]\d{9}$/.test(value) })} /></label>
        <button className="w-fit rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-60" disabled={saving} type="submit">Save details</button>
      </form>
      {errorMessage && <p className="mt-3 text-sm text-red-700" role="alert">{errorMessage}</p>}
    </article>
  );
}

function StaffManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");
  const { register, handleSubmit, watch, reset, setValue, formState: { errors, isSubmitting } } = useForm();
  const password = watch("password");

  async function loadUsers() {
    setLoading(true);
    setErrorMessage("");
    try {
      const response = await api.get("/users", { params: { role: "staff" } });
      setUsers(response.data.data.users);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Could not load users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadUsers(); }, []);

  async function createStaff(formData) {
    setErrorMessage("");
    setNotice("");
    try {
      await api.post("/users/staff", {
        name: formData.name,
        email: formData.email,
        mobile: formData.mobile,
        password: formData.password,
      });
      reset();
      setNotice("Staff account created.");
      await loadUsers();
    } catch (error) {
      setValue("password", "");
      setValue("confirmPassword", "");
      setErrorMessage(error.response?.data?.message || "Could not create the staff account.");
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-10 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold">Staff Management</h1>
        <p className="mt-2 text-slate-600">Create staff accounts, update staff details, and manage staff account status.</p>
        {notice && <p className="mt-5 rounded-lg bg-emerald-50 p-3 text-emerald-800" role="status">{notice}</p>}
        {errorMessage && <p className="mt-5 rounded-lg bg-red-50 p-3 text-red-800" role="alert">{errorMessage}</p>}

        <form className="mt-6 grid gap-4 rounded-2xl bg-white p-6 shadow-sm sm:grid-cols-2" onSubmit={handleSubmit(createStaff)}>
            <h2 className="text-xl font-semibold sm:col-span-2">Create Staff</h2>
            <label className="text-sm font-medium">Full Name *<input className={inputClass} autoComplete="name" {...register("name", { required: "Enter the staff member’s name." })} /></label>
            <label className="text-sm font-medium">Email *<input className={inputClass} type="email" autoComplete="email" {...register("email", { required: "Enter an email address." })} /></label>
            <label className="text-sm font-medium">Phone Number *<input className={inputClass} type="tel" autoComplete="tel" {...register("mobile", { required: "Enter a phone number.", setValueAs: (value) => value.trim().replace(/[\s-]/g, ""), validate: (value) => /^[6-9]\d{9}$/.test(value) || "Enter a valid 10-digit Indian mobile number." })} /></label>
            <label className="text-sm font-medium">Password *<PasswordInput className={inputClass} autoComplete="new-password" {...register("password", { required: "Choose a password.", minLength: { value: 8, message: "Use at least 8 characters." } })} /></label>
            <label className="text-sm font-medium">Confirm Password *<PasswordInput className={inputClass} autoComplete="new-password" {...register("confirmPassword", { required: "Confirm the password.", validate: (value) => value === password || "Passwords do not match." })} /></label>
            {Object.values(errors).length > 0 && <div className="space-y-1 text-sm text-red-600 sm:col-span-2">{Object.values(errors).map((error, index) => <p key={index}>{error.message}</p>)}</div>}
            <button className="w-fit rounded-lg bg-cyan-700 px-4 py-2.5 font-semibold text-white hover:bg-cyan-800 disabled:opacity-60" disabled={isSubmitting} type="submit">Create staff account</button>
        </form>

        <section className="mt-8">
          <h2 className="text-xl font-semibold">Staff accounts</h2>
          {loading ? <p className="py-8 text-center text-slate-600">Loading staff accounts…</p> : users.length === 0 ? <p className="mt-4 rounded-xl bg-white p-6 text-slate-600">No staff accounts found.</p> : (
            <div className="mt-4 space-y-4">{users.map((user) => <ManagedUserRow key={user._id} user={user} onUpdated={loadUsers} />)}</div>
          )}
        </section>
      </div>
    </main>
  );
}

export default StaffManagementPage;
