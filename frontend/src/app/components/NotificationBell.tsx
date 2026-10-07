import { useEffect, useRef, useState } from "react";
import { Bell, CalendarCheck, CheckCheck, CreditCard, MessageSquareText, Star, XCircle } from "lucide-react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { notificationsApi, type Notification } from "../lib/api";

export function NotificationBell() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const touristOnly = !!user?.roles.includes("TOURIST") && !user.roles.includes("ADMIN");

  const loadNotifications = () => {
    if (!isAuthenticated) return;
    setLoading(true);
    const request = touristOnly ? notificationsApi.touristList() : notificationsApi.list();
    request
      .then(setNotifications)
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      return;
    }
    loadNotifications();
    const intervalId = window.setInterval(loadNotifications, 30_000);
    const refresh = () => loadNotifications();
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refresh);
    };
  }, [isAuthenticated, user?.email]);

  useEffect(() => {
    const closeOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", closeOutside);
    return () => document.removeEventListener("mousedown", closeOutside);
  }, [open]);

  if (!isAuthenticated) return null;

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const openNotification = async (notification: Notification) => {
    if (!notification.read) {
      setNotifications((items) => items.map((item) => item.id === notification.id ? { ...item, read: true } : item));
      notificationsApi.markRead(notification.id).catch(loadNotifications);
    }
    setOpen(false);
    if (notification.referenceId) {
      navigate(touristOnly ? `/tourist/bookings/${notification.referenceId}` : "/dashboard/bookings");
    }
  };

  const markAllRead = async () => {
    setNotifications((items) => items.map((item) => ({ ...item, read: true })));
    try {
      setNotifications(await (touristOnly ? notificationsApi.markAllTouristRead() : notificationsApi.markAllRead()));
    } catch {
      loadNotifications();
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value);
          if (!open) loadNotifications();
        }}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-[70] w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <div className="flex h-14 items-center justify-between border-b border-gray-100 px-4 dark:border-slate-700">
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">{touristOnly ? "Trip updates" : "Notifications"}</h2>
              <p className="text-xs text-gray-400">{unreadCount ? `${unreadCount} unread` : "All caught up"}</p>
            </div>
            {unreadCount > 0 && (
              <button type="button" onClick={markAllRead} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0057B8] hover:underline dark:text-blue-400">
                <CheckCheck className="h-4 w-4" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[min(28rem,70vh)] overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-400">Loading {touristOnly ? "trip updates" : "notifications"}...</p>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-400">{touristOnly ? "No booking, payment, or trip updates yet." : "No notifications yet."}</p>
            ) : notifications.map((notification) => {
              const Icon = notificationIcon(notification.type);
              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => openNotification(notification)}
                  className={`flex w-full gap-3 border-b border-gray-100 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-gray-50 dark:border-slate-800 dark:hover:bg-slate-800 ${notification.read ? "bg-white dark:bg-slate-900" : "bg-rose-50/50 dark:bg-rose-950/10"}`}
                >
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-3">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{notification.title}</span>
                      {!notification.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-rose-500" />}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-gray-500 dark:text-slate-400">{notification.message}</span>
                    <span className="mt-1.5 block text-[11px] font-medium text-gray-400">{relativeTime(notification.createdAt)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function notificationIcon(type?: string) {
  if (type?.includes("PAYMENT")) return CreditCard;
  if (type?.includes("REVIEW")) return Star;
  if (type?.includes("CANCELLED")) return XCircle;
  if (type?.includes("COMPLETED")) return CheckCheck;
  if (type?.includes("STATUS")) return MessageSquareText;
  return CalendarCheck;
}

function relativeTime(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d ago` : new Date(timestamp).toLocaleDateString();
}
