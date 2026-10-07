import { useEffect, useState } from "react";
import api from "../services/api";

const emptySettings = {
  businessName: "", phone: "", email: "", address: "", city: "", state: "", pincode: "", gstin: "",
};

const fields = [
  ["businessName", "Business Name", true], ["phone", "Phone Number", true], ["email", "Business Email", false],
  ["address", "Address", true], ["city", "City", true], ["state", "State", false],
  ["pincode", "Pincode", false], ["gstin", "GSTIN", false],
];
const inputClass = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:border-cyan-600 focus:outline-none";

function BusinessSettingsPage() {
  const [settings, setSettings] = useState(emptySettings);
  const [logo, setLogo] = useState(null);
  const [existingLogo, setExistingLogo] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await api.get("/business-settings");
        const saved = response.data.data.settings;
        if (saved) {
          setSettings(Object.fromEntries(Object.keys(emptySettings).map((key) => [key, saved[key] || ""])));
          setExistingLogo(typeof saved.logo === "string" ? saved.logo : saved.logo?.url || "");
        }
      } catch (error) {
        setErrorMessage(error.response?.data?.message || "Could not load business settings.");
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  function updateField(event) {
    setSettings({ ...settings, [event.target.name]: event.target.value });
  }

  async function saveSettings(event) {
    event.preventDefault();
    setSaving(true);
    setNotice("");
    setErrorMessage("");
    const formData = new FormData();
    for (const [key, value] of Object.entries(settings)) formData.append(key, value);
    if (logo) formData.append("logo", logo);

    try {
      const response = await api.put("/business-settings", formData);
      const savedLogo = response.data.data.settings.logo;
      setExistingLogo(typeof savedLogo === "string" ? savedLogo : savedLogo?.url || "");
      setLogo(null);
      setNotice("Business settings saved.");
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Could not save business settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-8 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-800">Admin settings</p>
        <h1 className="mt-2 text-3xl font-bold">Business Settings</h1>
        <p className="mt-2 text-slate-600">Manage the business information used throughout the rental system and invoices.</p>

        {errorMessage && <p className="mt-5 rounded-lg bg-red-50 p-4 text-sm text-red-800" role="alert">{errorMessage}</p>}
        {notice && <p className="mt-5 rounded-lg bg-green-50 p-4 text-sm text-green-800" role="status">{notice}</p>}
        {loading ? <p className="py-10 text-center text-slate-600">Loading business settings…</p> : (
          <form className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7" onSubmit={saveSettings}>
            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map(([name, label, required]) => (
                <label className="text-sm font-medium text-slate-700" key={name}>
                  {label}{required ? " *" : ""}
                  <input className={inputClass} name={name} onChange={updateField} required={required} type={name === "email" ? "email" : "text"} value={settings[name]} />
                </label>
              ))}
            </div>
            <div className="mt-5">
              <label className="text-sm font-medium text-slate-700" htmlFor="business-logo">Business Logo</label>
              <input accept="image/jpeg,image/png,image/webp" className="mt-1 block w-full text-sm text-slate-700" id="business-logo" onChange={(event) => setLogo(event.target.files?.[0] || null)} type="file" />
              <p className="mt-1 text-xs text-slate-500">JPG, PNG, or WebP, up to 5 MB.</p>
              {existingLogo && <img alt="Current business logo" className="mt-3 h-16 max-w-48 object-contain" src={existingLogo} />}
            </div>
            <button className="mt-6 rounded-lg bg-cyan-700 px-5 py-3 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-60" disabled={saving} type="submit">
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

export default BusinessSettingsPage;
