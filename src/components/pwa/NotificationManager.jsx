import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

// Configuração do Firebase (você precisa adicionar suas credenciais)
const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

export default function NotificationManager({ user }) {
  const [permission, setPermission] = useState(Notification.permission);
  const [fcmToken, setFcmToken] = useState(null);

  useEffect(() => {
    if (!user) return;

    // Registrar service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
        .then((registration) => {
          console.log('Service Worker registrado:', registration);
        })
        .catch((error) => {
          console.error('Erro ao registrar Service Worker:', error);
        });
    }

    // Solicitar permissão para notificações
    requestNotificationPermission();

    // Escutar mensagens do service worker
    if (navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    return () => {
      if (navigator.serviceWorker) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, [user]);

  const handleServiceWorkerMessage = (event) => {
    if (event.data.type === 'PLAY_SOUND') {
      playSound(event.data.sound);
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      console.log('Este navegador não suporta notificações');
      return;
    }

    if (Notification.permission === 'granted') {
      setPermission('granted');
      // Aqui você integraria com o Firebase para obter o FCM token
      // initializeFirebase();
    } else if (Notification.permission !== 'denied') {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        // initializeFirebase();
      }
    }
  };

  const showNotification = (title, options) => {
    if (permission !== 'granted') return;

    if (navigator.serviceWorker) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, {
          icon: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f81f10a039cb25fee3024b/1597e9e5a_logofundopreto.png',
          badge: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f81f10a039cb25fee3024b/1597e9e5a_logofundopreto.png',
          vibrate: [200, 100, 200],
          ...options
        });
      });
    }
  };

  const playSound = (soundName) => {
    const audio = new Audio(`/sounds/${soundName}`);
    audio.play().catch(err => console.log('Erro ao reproduzir som:', err));
  };

  // Expor funções globalmente para uso em outras partes do app
  useEffect(() => {
    window.frNotifications = {
      show: showNotification,
      playSound: playSound,
      permission: permission
    };
  }, [permission]);

  return null;
}