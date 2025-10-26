import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Download, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function PWASetup() {
  const manifestCode = `{
  "name": "FR TRANSPORTES & Serviços",
  "short_name": "FR TRANSPORTES",
  "description": "Sistema completo de gestão de transportes e serviços",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#00ff66",
  "background_color": "#0f0f0f",
  "scope": "/",
  "icons": [
    {
      "src": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f81f10a039cb25fee3024b/1597e9e5a_logofundopreto.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f81f10a039cb25fee3024b/1597e9e5a_logofundopreto.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "categories": ["business", "productivity"],
  "lang": "pt-BR",
  "dir": "ltr"
}`;

  const serviceWorkerCode = `/* eslint-disable no-restricted-globals */
// Service Worker para FR TRANSPORTES PWA
const CACHE_NAME = 'fr-transportes-v1';
const RUNTIME_CACHE = 'fr-transportes-runtime';

const ESSENTIAL_FILES = [
  '/',
  '/index.html',
  '/static/css/main.css',
  '/static/js/main.js',
];

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching essential files');
      return cache.addAll(ESSENTIAL_FILES);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const responseToCache = response.clone();
        caches.open(RUNTIME_CACHE).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
  );
});

self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received:', event);
  
  let data = {};
  if (event.data) {
    data = event.data.json();
  }

  const title = data.title || 'FR TRANSPORTES';
  const options = {
    body: data.body || 'Nova notificação',
    icon: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f81f10a039cb25fee3024b/1597e9e5a_logofundopreto.png',
    badge: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f81f10a039cb25fee3024b/1597e9e5a_logofundopreto.png',
    vibrate: data.vibrate || [200, 100, 200],
    data: data.data || {},
    tag: data.tag || 'default',
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || []
  };

  if (data.sound) {
    self.clients.matchAll().then((clientList) => {
      clientList.forEach((client) => {
        client.postMessage({
          type: 'PLAY_SOUND',
          sound: data.sound
        });
      });
    });
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event);
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  try {
    console.log('[Service Worker] Syncing data...');
  } catch (error) {
    console.error('[Service Worker] Sync failed:', error);
  }
}`;

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado para área de transferência!`);
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <Alert className="border-blue-500 bg-blue-500/10">
        <Info className="w-5 h-5 text-blue-500" />
        <AlertDescription className="text-white">
          <p className="font-bold mb-2">Instruções para ativar o PWA:</p>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Copie o código do <strong>manifest.json</strong> abaixo</li>
            <li>Crie um arquivo chamado <code className="bg-black/30 px-2 py-1 rounded">manifest.json</code> na pasta <code className="bg-black/30 px-2 py-1 rounded">public/</code></li>
            <li>Cole o conteúdo copiado no arquivo</li>
            <li>Copie o código do <strong>service-worker.js</strong></li>
            <li>Crie um arquivo chamado <code className="bg-black/30 px-2 py-1 rounded">service-worker.js</code> na pasta <code className="bg-black/30 px-2 py-1 rounded">public/</code></li>
            <li>Cole o conteúdo copiado no arquivo</li>
            <li>Adicione no <code className="bg-black/30 px-2 py-1 rounded">index.html</code> dentro do <code>&lt;head&gt;</code>:
              <pre className="bg-black/30 p-2 rounded mt-2 text-xs overflow-x-auto">
{`<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#00ff66">`}
              </pre>
            </li>
            <li>Crie a pasta <code className="bg-black/30 px-2 py-1 rounded">public/sounds/</code> e adicione os arquivos de som</li>
          </ol>
        </AlertDescription>
      </Alert>

      {/* Manifest.json */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-green-500" />
            manifest.json
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => copyToClipboard(manifestCode, "manifest.json")}
            className="gap-2"
          >
            <Copy className="w-4 h-4" />
            Copiar
          </Button>
        </div>
        <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm text-gray-300 border border-gray-700">
          <code>{manifestCode}</code>
        </pre>
      </div>

      {/* Service Worker */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-green-500" />
            service-worker.js
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => copyToClipboard(serviceWorkerCode, "service-worker.js")}
            className="gap-2"
          >
            <Copy className="w-4 h-4" />
            Copiar
          </Button>
        </div>
        <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm text-gray-300 border border-gray-700 max-h-96">
          <code>{serviceWorkerCode}</code>
        </pre>
      </div>

      {/* Arquivos de Som */}
      <Alert className="border-yellow-500 bg-yellow-500/10">
        <Download className="w-5 h-5 text-yellow-500" />
        <AlertDescription className="text-white">
          <p className="font-bold mb-2">Arquivos de som necessários:</p>
          <p className="text-sm mb-2">Crie a pasta <code className="bg-black/30 px-2 py-1 rounded">public/sounds/</code> e adicione:</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li><code>notificacao1.mp3</code> - Novo serviço</li>
            <li><code>alerta.mp3</code> - Serviço urgente</li>
            <li><code>notificacao2.mp3</code> - Serviço concluído</li>
            <li><code>notificacao3.mp3</code> - Novo agendamento</li>
            <li><code>notificacao4.mp3</code> - Conta vencendo</li>
            <li><code>ping.mp3</code> - Mensagem no chat</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}