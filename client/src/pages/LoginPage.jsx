import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { getRoleLandingPath } from "../components/ProtectedRoute";
import { useAuth } from "../context/AuthContext";
import PasswordInput from "../components/PasswordInput";

function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm();

  if (user) {
    return <Navigate to={getRoleLandingPath(user.role)} replace />;
  }

  async function submitLogin(formData) {
    setServerError("");

    try {
      const authenticatedUser = await login(formData.email, formData.password);
      const requestedPath = location.state?.from?.pathname;
      reset();
      const landingPath = getRoleLandingPath(authenticatedUser.role);
      navigate(authenticatedUser.role === "admin" ? landingPath : requestedPath || landingPath, { replace: true });
    } catch (error) {
      setValue("password", "");
      setServerError(error.response?.data?.message || "Could not log in. Check the API connection.");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-md">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">Smart Car Rental</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">Welcome back</h1>
        <p className="mt-2 text-slate-600">Sign in with your account. Your role is read from your account.</p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit(submitLogin)}>
          <label className="block text-sm font-medium text-slate-700">
            Email
            <input
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              type="email"
              autoComplete="email"
              {...register("email", { required: "Enter your email." })}
            />
            {errors.email && <span className="mt-1 block text-sm text-red-600">{errors.email.message}</span>}
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Password *
            <PasswordInput
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 pr-16 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              autoComplete="current-password"
              {...register("password", { required: "Enter your password." })}
            />
            {errors.password && <span className="mt-1 block text-sm text-red-600">{errors.password.message}</span>}
          </label>

          {serverError && <p role="alert" className="text-sm text-red-700">{serverError}</p>}

          <button
            className="w-full rounded-lg bg-cyan-700 px-4 py-3 font-semibold text-white transition-colors hover:bg-cyan-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          New customer? <Link className="font-semibold text-cyan-800 hover:underline" to="/register">Create an account</Link>
        </p>
      </section>
    </main>
  );
}

export default LoginPage;
