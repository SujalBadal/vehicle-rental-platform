import { createContext, useCallback, useContext, useEffect, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");

  const loadNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    try {
      const response = await api.get("/notifications");
      setNotifications(response.data.data.notifications);
      setUnreadCount(response.data.data.unreadCount);
      setNotificationsError("");
      return true;
    } catch (error) {
      setNotificationsError(error.response?.data?.message || "Could not load notifications.");
      return false;
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  const markNotificationRead = useCallback(async (notificationId) => {
    try {
      await api.patch(`/notifications/${notificationId}/read`);
      return await loadNotifications();
    } catch (error) {
      setNotificationsError(error.response?.data?.message || "Could not update notification.");
      return false;
    }
  }, [loadNotifications]);

  const markAllNotificationsRead = useCallback(async () => {
    try {
      await api.patch("/notifications/read-all");
      return await loadNotifications();
    } catch (error) {
      setNotificationsError(error.response?.data?.message || "Could not update notifications.");
      return false;
    }
  }, [loadNotifications]);

  useEffect(() => {
    if (user) {
      loadNotifications();
      return;
    }

    setNotifications([]);
    setUnreadCount(0);
    setNotificationsError("");
  }, [user?._id, loadNotifications]);

  useEffect(() => {
    async function loadCurrentUser() {
      const token = localStorage.getItem("accessToken");

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get("/auth/me");
        setUser(response.data.data.user);
      } catch (error) {
        localStorage.removeItem("accessToken");
      } finally {
        setLoading(false);
      }
    }

    loadCurrentUser();
  }, []);

  async function saveAuthenticationResponse(response) {
    const { token, user: authenticatedUser } = response.data.data;
    localStorage.setItem("accessToken", token);
    setUnreadCount(0);
    setUser(authenticatedUser);
    return authenticatedUser;
  }

  async function login(email, password) {
    const response = await api.post("/auth/login", { email, password });
    return saveAuthenticationResponse(response);
  }

  async function register(accountDetails) {
    const response = await api.post("/auth/register", accountDetails);
    return saveAuthenticationResponse(response);
  }

  function logout() {
    localStorage.removeItem("accessToken");
    setUser(null);
  }

  function updateUser(updatedUser) {
    setUser(updatedUser);
  }

  const contextValue = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
    notifications,
    unreadCount,
    notificationsLoading,
    notificationsError,
    loadNotifications,
    markNotificationRead,
    markAllNotificationsRead,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const auth = useContext(AuthContext);

  if (!auth) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return auth;
}
