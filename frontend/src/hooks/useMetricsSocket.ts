import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import type { SiteMetrics } from '@/types/emissions';

export function useMetricsSocket(onUpdate: (metrics: SiteMetrics) => void): { connected: boolean } {
  const [connected, setConnected] = useState(false);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    const socket = io({ transports: ['websocket'] });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('site:metrics:updated', (metrics: SiteMetrics) => {
      onUpdateRef.current(metrics);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return { connected };
}
