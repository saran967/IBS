// src/hooks/useNotifications.js
import { useEffect, useRef, useState } from "react";
import customFetch from "../utils/customFetch";

export default function useNotifications(pollIntervalMs = 10000) {
  const [notifications, setNotifications] = useState({
    counts: { orders: 0, tokens: 0, total: 0 },
    orders: [],
    tokens: [],
    serverTime: null,
  });
  const intervalRef = useRef(null);
  const lastSinceRef = useRef(null);

  const fetchNotifications = async (since) => {
    try {
      const params = new URLSearchParams();
      if (since) params.set("since", since);
      const res = await customFetch.get(`/notifications?${params.toString()}`);
      if (res.data?.success) {
        setNotifications({
          counts: res.data.counts || { orders: 0, tokens: 0, total: 0 },
          orders: res.data.orders || [],
          tokens: res.data.tokens || [],
          serverTime: res.data.serverTime || new Date().toISOString(),
        });
        lastSinceRef.current = res.data.serverTime || new Date().toISOString();
      }
    } catch (err) {
      // fail silently; UI will show nothing
      // console.error("fetchNotifications:", err);
    }
  };

  useEffect(() => {
    // initial fetch with default window (server will default to 24h)
    fetchNotifications();

    intervalRef.current = setInterval(() => {
      // ask for updates since last poll time to reduce data
      fetchNotifications(lastSinceRef.current);
    }, pollIntervalMs);

    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollIntervalMs]);

  return {
    notifications,
    refetch: () => fetchNotifications(lastSinceRef.current),
  };
}
