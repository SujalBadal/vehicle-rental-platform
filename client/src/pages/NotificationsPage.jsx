import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function NotificationsPage() {
  const {
    user,
    notifications,
    unreadCount,
    notificationsLoading: loading,
    notificationsError: errorMessage,
    loadNotifications,
    markNotificationRead,
    markAllNotificationsRead,
  } = useAuth();

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-10 text-slate-900">
      <div className="mx-auto max-w-4xl">
        <Link className="text-sm font-semibold text-cyan-800 hover:underline" to={user.role === "admin" ? "/admin/dashboard" : "/"}>← Back to Dashboard</Link>
        <div className="mt-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div><h1 className="text-3xl font-bold">Notifications</h1><p className="mt-2 text-slate-600">{unreadCount} unread</p></div>
          {unreadCount > 0 && <button className="text-sm font-semibold text-cyan-800 hover:underline" onClick={markAllNotificationsRead} type="button">Mark all as read</button>}
        </div>

        {errorMessage && <p className="mt-5 rounded-lg bg-red-50 p-3 text-red-800" role="alert">{errorMessage}</p>}
        {loading ? <p className="py-10 text-center text-slate-600">Loading notifications…</p> : notifications.length === 0 ? <p className="mt-7 rounded-xl bg-white p-7 text-slate-600">You have no notifications.</p> : (
          <section className="mt-6 space-y-3">
            {notifications.map((notification) => (
              <article className={`rounded-xl border bg-white p-5 shadow-sm ${notification.readAt ? "border-slate-200" : "border-cyan-300"}`} key={notification._id}>
                <div className="flex items-start justify-between gap-4">
                  <div><h2 className="font-semibold">{notification.title}</h2><p className="mt-2 text-sm leading-6 text-slate-700">{notification.message}</p><p className="mt-2 text-xs text-slate-500">{new Date(notification.createdAt).toLocaleString()} · {notification.type}</p></div>
                  {!notification.readAt && <button className="shrink-0 text-sm font-semibold text-cyan-800 hover:underline" onClick={() => markNotificationRead(notification._id)} type="button">Mark read</button>}
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

export default NotificationsPage;
