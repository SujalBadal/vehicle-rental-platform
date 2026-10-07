import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import PasswordInput from "../components/PasswordInput";

const inputClass = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 pr-16 focus:border-cyan-600 focus:outline-none";

function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(user);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");
  const profileForm = useForm({ defaultValues: { name: user.name, mobile: user.mobile || "" } });
  const passwordForm = useForm();
  const newPassword = passwordForm.watch("newPassword");

  useEffect(() => {
    api.get("/users/me")
      .then((response) => {
        const currentProfile = response.data.data.user;
        setProfile(currentProfile);
        updateUser(currentProfile);
        profileForm.reset({ name: currentProfile.name, mobile: currentProfile.mobile || "" });
      })
      .catch((error) => setErrorMessage(error.response?.data?.message || "Could not load your profile."))
      .finally(() => setLoading(false));
  }, []);

  async function saveProfile(formData) {
    setErrorMessage("");
    setNotice("");
    try {
      const response = await api.patch("/users/me", formData);
      setProfile(response.data.data.user);
      updateUser(response.data.data.user);
      setNotice("Profile updated.");
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Could not update your profile.");
    }
  }

  async function savePassword(formData) {
    setErrorMessage("");
    setNotice("");
    try {
      await api.patch("/users/me/password", {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });
      passwordForm.reset();
      setNotice("Password changed successfully.");
    } catch (error) {
      passwordForm.reset();
      setErrorMessage(error.response?.data?.message || "Could not change your password.");
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-10 text-slate-900">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold">My Profile</h1>
        {notice && <p className="mt-5 rounded-lg bg-emerald-50 p-3 text-emerald-800" role="status">{notice}</p>}
        {errorMessage && <p className="mt-5 rounded-lg bg-red-50 p-3 text-red-800" role="alert">{errorMessage}</p>}
        {loading ? <p className="py-10 text-center text-slate-600">Loading your profile…</p> : (
          <>
            <form className="mt-6 space-y-4 rounded-2xl bg-white p-6 shadow-sm" onSubmit={profileForm.handleSubmit(saveProfile)}>
              <h2 className="text-xl font-semibold">Account details</h2>
              <label className="block text-sm font-medium">Name *<input className={inputClass} {...profileForm.register("name", { required: "Enter your name." })} /></label>
              {profileForm.formState.errors.name && <p className="text-sm text-red-600">{profileForm.formState.errors.name.message}</p>}
              <label className="block text-sm font-medium">Email<input className={inputClass} value={profile?.email || ""} readOnly /></label>
              <label className="block text-sm font-medium">Phone Number *<input className={inputClass} type="tel" autoComplete="tel" {...profileForm.register("mobile", { required: "Enter your phone number.", setValueAs: (value) => value.trim().replace(/[\s-]/g, ""), validate: (value) => /^[6-9]\d{9}$/.test(value) || "Enter a valid 10-digit Indian mobile number." })} /></label>
              {profileForm.formState.errors.mobile && <p className="text-sm text-red-600">{profileForm.formState.errors.mobile.message}</p>}
              <dl className="grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
                <div><dt className="text-sm text-slate-500">Role</dt><dd className="font-medium capitalize">{profile?.role}</dd></div>
                <div><dt className="text-sm text-slate-500">Account status</dt><dd className="font-medium">{profile?.isActive ? "Active" : "Inactive"}</dd></div>
              </dl>
              <button className="rounded-lg bg-cyan-700 px-4 py-2.5 font-semibold text-white hover:bg-cyan-800" type="submit">Save profile</button>
            </form>

            <form className="mt-6 space-y-4 rounded-2xl bg-white p-6 shadow-sm" onSubmit={passwordForm.handleSubmit(savePassword)}>
              <h2 className="text-xl font-semibold">Change password</h2>
              <label className="block text-sm font-medium">Current Password *<PasswordInput className={inputClass} autoComplete="current-password" {...passwordForm.register("currentPassword", { required: "Enter your current password." })} /></label>
              {passwordForm.formState.errors.currentPassword && <p className="text-sm text-red-600">{passwordForm.formState.errors.currentPassword.message}</p>}
              <label className="block text-sm font-medium">New Password *<PasswordInput className={inputClass} autoComplete="new-password" {...passwordForm.register("newPassword", { required: "Enter a new password.", minLength: { value: 8, message: "Use at least 8 characters." } })} /></label>
              {passwordForm.formState.errors.newPassword && <p className="text-sm text-red-600">{passwordForm.formState.errors.newPassword.message}</p>}
              <label className="block text-sm font-medium">Confirm New Password *<PasswordInput className={inputClass} autoComplete="new-password" {...passwordForm.register("confirmNewPassword", { required: "Confirm your new password.", validate: (value) => value === newPassword || "Passwords do not match." })} /></label>
              {passwordForm.formState.errors.confirmNewPassword && <p className="text-sm text-red-600">{passwordForm.formState.errors.confirmNewPassword.message}</p>}
              <button className="rounded-lg bg-cyan-700 px-4 py-2.5 font-semibold text-white hover:bg-cyan-800" type="submit">Change password</button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}

export default ProfilePage;
