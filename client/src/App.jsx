import { Link, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute, { getRoleLandingPath } from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import DashboardPage from "./pages/DashboardPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import CategoryManagementPage from "./pages/CategoryManagementPage";
import BookingDetailPage from "./pages/BookingDetailPage";
import BookingListPage from "./pages/BookingListPage";
import FleetPage from "./pages/FleetPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import RentalManagementPage from "./pages/RentalManagementPage";
import PaymentPage from "./pages/PaymentPage";
import InvoicePage from "./pages/InvoicePage";
import MaintenancePage from "./pages/MaintenancePage";
import NotificationsPage from "./pages/NotificationsPage";
import ReportsPage from "./pages/ReportsPage";
import VehicleDetailPage from "./pages/VehicleDetailPage";
import VehicleListPage from "./pages/VehicleListPage";
import ProfilePage from "./pages/ProfilePage";
import StaffManagementPage from "./pages/StaffManagementPage";
import BusinessSettingsPage from "./pages/BusinessSettingsPage";

function HomeRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="p-8 text-center text-slate-600">Loading your account…</div>;
  }

  return <Navigate to={user ? getRoleLandingPath(user.role) : "/login"} replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/vehicles" element={<VehicleListPage />} />
      <Route path="/vehicles/:vehicleId" element={<VehicleDetailPage />} />
      <Route path="/bookings/:bookingId" element={<ProtectedRoute><BookingDetailPage /></ProtectedRoute>} />
      <Route path="/customer/bookings" element={<ProtectedRoute allowedRoles={["customer"]}><BookingListPage /></ProtectedRoute>} />
      <Route path="/staff/bookings" element={<ProtectedRoute allowedRoles={["staff", "admin"]}><BookingListPage /></ProtectedRoute>} />
      <Route path="/admin/bookings" element={<ProtectedRoute allowedRoles={["admin"]}><BookingListPage /></ProtectedRoute>} />
      <Route path="/staff/rentals" element={<ProtectedRoute allowedRoles={["staff", "admin"]}><RentalManagementPage /></ProtectedRoute>} />
      <Route path="/admin/rentals" element={<ProtectedRoute allowedRoles={["admin"]}><RentalManagementPage /></ProtectedRoute>} />
      <Route path="/customer/payments" element={<ProtectedRoute allowedRoles={["customer"]}><PaymentPage /></ProtectedRoute>} />
      <Route path="/staff/payments" element={<ProtectedRoute allowedRoles={["staff", "admin"]}><PaymentPage /></ProtectedRoute>} />
      <Route path="/admin/payments" element={<ProtectedRoute allowedRoles={["admin"]}><PaymentPage /></ProtectedRoute>} />
      <Route path="/customer/invoices" element={<ProtectedRoute allowedRoles={["customer"]}><InvoicePage /></ProtectedRoute>} />
      <Route path="/staff/invoices" element={<ProtectedRoute allowedRoles={["staff", "admin"]}><InvoicePage /></ProtectedRoute>} />
      <Route path="/admin/invoices" element={<ProtectedRoute allowedRoles={["admin"]}><InvoicePage /></ProtectedRoute>} />
      <Route path="/staff/maintenance" element={<ProtectedRoute allowedRoles={["staff", "admin"]}><MaintenancePage /></ProtectedRoute>} />
      <Route path="/admin/maintenance" element={<ProtectedRoute allowedRoles={["admin"]}><MaintenancePage /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute allowedRoles={["customer", "staff", "admin"]}><ProfilePage /></ProtectedRoute>} />
      <Route path="/admin/staff" element={<ProtectedRoute allowedRoles={["admin"]}><StaffManagementPage /></ProtectedRoute>} />
      <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboardPage /></ProtectedRoute>} />
      <Route path="/admin/business-settings" element={<ProtectedRoute allowedRoles={["admin"]}><BusinessSettingsPage /></ProtectedRoute>} />
      <Route path="/staff/reports" element={<ProtectedRoute allowedRoles={["staff"]}><ReportsPage /></ProtectedRoute>} />
      <Route
        path="/customer/dashboard"
        element={<ProtectedRoute allowedRoles={["customer"]}><DashboardPage /></ProtectedRoute>}
      />
      <Route
        path="/staff/dashboard"
        element={<ProtectedRoute allowedRoles={["staff"]}><DashboardPage /></ProtectedRoute>}
      />
      <Route
        path="/staff/vehicles"
        element={<ProtectedRoute allowedRoles={["staff", "admin"]}><FleetPage /></ProtectedRoute>}
      />
      <Route
        path="/admin/vehicles"
        element={<ProtectedRoute allowedRoles={["admin"]}><FleetPage /></ProtectedRoute>}
      />
      <Route
        path="/admin/categories"
        element={<ProtectedRoute allowedRoles={["admin"]}><CategoryManagementPage /></ProtectedRoute>}
      />
      <Route path="*" element={(
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-100 p-6 text-center text-slate-900">
          <h1 className="text-3xl font-bold">Page not found</h1>
          <p className="text-slate-600">The page you requested does not exist.</p>
          <Link className="font-semibold text-cyan-800 hover:underline" to="/">Go to your dashboard</Link>
        </main>
      )} />
    </Routes>
  );
}

export default App;
