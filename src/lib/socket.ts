import { io, Socket } from 'socket.io-client';

// Use the same origin as the window location in production, localhost in development
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const SOCKET_URL = isDevelopment
  ? 'http://localhost:3001'
  : window.location.origin;

let socket: Socket | null = null;

export const getSocket = () => {
  if (!socket) {
    console.log('🔌 Conectando a Socket.IO en:', SOCKET_URL);
    socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('✅ Conectado al servidor Socket.IO');
    });

    socket.on('disconnect', () => {
      console.log('❌ Desconectado del servidor Socket.IO');
    });

    socket.on('connect_error', (error) => {
      console.error('Error de conexión:', error);
    });
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
