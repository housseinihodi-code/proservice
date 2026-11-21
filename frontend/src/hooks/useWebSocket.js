import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuthStore } from "../store/authStore";

export function useWebSocket() {
  const socket = useRef(null);
  const [connected, setConnected] = useState(false);
  const { token, user } = useAuthStore();

  useEffect(() => {
    if (!token || !user) return;

    const WS_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
    socket.current = io(WS_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.current.on("connect", () => setConnected(true));
    socket.current.on("disconnect", () => setConnected(false));

    return () => {
      socket.current?.disconnect();
    };
  }, [token, user]);

  const emit = (event, data) => socket.current?.emit(event, data);
  const on = (event, handler) => {
    socket.current?.on(event, handler);
    return () => socket.current?.off(event, handler);
  };

  return { socket: socket.current, connected, emit, on };
}
