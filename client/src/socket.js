import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

// Singleton socket instance
const socket = io(SOCKET_URL, {
  autoConnect: false, // We'll connect manually
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  transports: ['websocket', 'polling'],
});

socket.on('connect_error', (error) => {
  console.error('Socket connection error:', error.message);
});

socket.on('reconnect_attempt', (attempt) => {
  console.log(`Socket reconnection attempt ${attempt}`);
});

socket.on('reconnect', (attempt) => {
  console.log(`Socket reconnected after ${attempt} attempts`);
});

export default socket;
