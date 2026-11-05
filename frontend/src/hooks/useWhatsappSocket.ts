import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_URL, tokenStore } from '../lib/api';
import { useWhatsappStore } from '../stores/whatsappStore';

export function useWhatsappSocket() {
  const socketRef = useRef<Socket | null>(null);
  const {
    onMessageCreated,
    onMessageStatus,
    onConversationUpdated,
    setIsSocketConnected,
  } = useWhatsappStore();

  useEffect(() => {
    const token = tokenStore.get();
    const socket = io(`${API_URL}/whatsapp`, {
      transports: ['websocket', 'polling'],
      auth: { token },
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsSocketConnected(true);
    });

    socket.on('disconnect', () => {
      setIsSocketConnected(false);
    });

    socket.on('whatsapp:message:created', (data) => {
      onMessageCreated(data);
    });

    socket.on('whatsapp:message:status', (data) => {
      onMessageStatus(data);
    });

    socket.on('whatsapp:conversation:updated', (data) => {
      onConversationUpdated(data);
    });

    return () => {
      socket.disconnect();
    };
  }, [
    onMessageCreated,
    onMessageStatus,
    onConversationUpdated,
    setIsSocketConnected,
  ]);
}

