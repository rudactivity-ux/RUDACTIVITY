import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext.tsx';

interface WebSocketContextType {
  isConnected: boolean;
  sendEvent: (event: string, payload: any) => void;
  addListener: (event: string, callback: (payload: any) => void) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const socketRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef<Map<string, Set<(payload: any) => void>>>(new Map());
  const reconnectTimeoutRef = useRef<any>(null);

  const connect = useCallback(() => {
    if (!token) return;

    if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host || 'localhost:3000';
    const wsUrl = `${protocol}//${host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        // Identify authenticated session
        ws.send(JSON.stringify({
          event: 'auth:identify',
          payload: { token },
        }));
      };

      ws.onmessage = (event) => {
        try {
          const { event: evtName, payload } = JSON.parse(event.data);
          const listeners = listenersRef.current.get(evtName);
          if (listeners) {
            listeners.forEach((callback) => callback(payload));
          }
        } catch (e) {
          console.error('Error parsing WS message:', e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Auto-reconnect after 2 seconds
        if (token) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 2000);
        }
      };

      ws.onerror = (err) => {
        console.warn('WebSocket connection error, will retry...', err);
        ws.close();
      };
    } catch (e) {
      console.error('WebSocket initialization failure:', e);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      connect();
    } else {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      setIsConnected(false);
    }

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [token, connect]);

  const sendEvent = useCallback((event: string, payload: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ event, payload }));
    } else {
      console.warn('Socket not open, cannot send event:', event);
    }
  }, []);

  const addListener = useCallback((event: string, callback: (payload: any) => void) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event)!.add(callback);

    // Return unsubscriber
    return () => {
      const listeners = listenersRef.current.get(event);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ isConnected, sendEvent, addListener }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
