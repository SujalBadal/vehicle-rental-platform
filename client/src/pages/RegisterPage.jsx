import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { getRoleLandingPath } from "../components/ProtectedRoute";
import { useAuth } from "../context/AuthContext";
import PasswordInput from "../components/PasswordInput";

function RegisterPage() {
  const { user, register: createCustomerAccount } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm();
  const password = watch("password");

  if (user) {
    return <Navigate to={getRoleLandingPath(user.role)} replace />;
  }

  async function submitRegistration(formData) {
    setServerError("");

    try {
      const accountDetails = { ...formData };
      delete accountDetails.confirmPassword;
      const customer = await createCustomerAccount(accountDetails);
      reset();
      navigate(getRoleLandingPath(customer.role), { replace: true });
    } catch (error) {
      setValue("password", "");
      setValue("confirmPassword", "");
      setServerError(error.response?.data?.message || "Could not create your account. Check the API connection.");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-md">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">Smart Car Rental</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">Create your account</h1>
        <p className="mt-2 text-slate-600">Customer registration. Staff and admin accounts are created separately.</p>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit(submitRegistration)}>
          <label className="block text-sm font-medium text-slate-700">
            Full Name *
            <input className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:border-cyan-600 focus:outline-none" autoComplete="name" {...register("name", { required: "Enter your name." })} />
            {errors.name && <span className="mt-1 block text-sm text-red-600">{errors.name.message}</span>}
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Email *
            <input className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:border-cyan-600 focus:outline-none" type="email" autoComplete="email" {...register("email", { required: "Enter your email." })} />
            {errors.email && <span className="mt-1 block text-sm text-red-600">{errors.email.message}</span>}
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Phone Number *
            <input className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:border-cyan-600 focus:outline-none" type="tel" autoComplete="tel" {...register("mobile", { required: "Enter your phone number.", setValueAs: (value) => value.trim().replace(/[\s-]/g, ""), validate: (value) => /^[6-9]\d{9}$/.test(value) || "Enter a valid 10-digit Indian mobile number." })} />
            {errors.mobile && <span className="mt-1 block text-sm text-red-600">{errors.mobile.message}</span>}
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Password *
            <PasswordInput className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 pr-16 focus:border-cyan-600 focus:outline-none" autoComplete="new-password" {...register("password", { required: "Choose a password.", minLength: { value: 8, message: "Use at least 8 characters." } })} />
            {errors.password && <span className="mt-1 block text-sm text-red-600">{errors.password.message}</span>}
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Confirm Password *
            <PasswordInput className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 pr-16 focus:border-cyan-600 focus:outline-none" autoComplete="new-password" {...register("confirmPassword", { required: "Confirm your password.", validate: (value) => value === password || "Passwords do not match." })} />
            {errors.confirmPassword && <span className="mt-1 block text-sm text-red-600">{errors.confirmPassword.message}</span>}
          </label>

          {serverError && <p role="alert" className="text-sm text-red-700">{serverError}</p>}

          <button className="w-full rounded-lg bg-cyan-700 px-4 py-3 font-semibold text-white transition-colors hover:bg-cyan-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Creating account…" : "Create customer account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already registered? <Link className="font-semibold text-cyan-800 hover:underline" to="/login">Sign in</Link>
        </p>
      </section>
    </main>
  );
}

export default RegisterPage;
