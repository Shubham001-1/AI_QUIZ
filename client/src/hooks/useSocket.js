import { useEffect, useRef, useState, useCallback } from 'react';
import socket from '../socket';

const useSocket = () => {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const listenersRef = useRef([]);

  useEffect(() => {
    // Connect when hook mounts
    if (!socket.connected) {
      socket.connect();
    }

    const handleConnect = () => {
      setIsConnected(true);
      console.log('Socket connected:', socket.id);
    };

    const handleDisconnect = (reason) => {
      setIsConnected(false);
      console.log('Socket disconnected:', reason);
    };

    const handleReconnect = () => {
      setIsConnected(true);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('reconnect', handleReconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('reconnect', handleReconnect);
    };
  }, []);

  // Stable references using useCallback so they don't trigger useEffect re-runs
  const on = useCallback((event, handler) => {
    socket.on(event, handler);
    listenersRef.current.push({ event, handler });
  }, []);

  const off = useCallback((event, handler) => {
    socket.off(event, handler);
    listenersRef.current = listenersRef.current.filter(
      (l) => !(l.event === event && l.handler === handler)
    );
  }, []);

  const emit = useCallback((event, data) => {
    socket.emit(event, data);
  }, []);

  const removeAllListeners = useCallback(() => {
    listenersRef.current.forEach(({ event, handler }) => {
      socket.off(event, handler);
    });
    listenersRef.current = [];
  }, []);

  return { socket, isConnected, on, off, emit, removeAllListeners };
};

export default useSocket;
