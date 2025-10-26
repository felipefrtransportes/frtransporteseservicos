import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Download, Copy, FileText, Music, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function PWAInstructions() {
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

  const serviceWorkerCode = `/* Service Worker FR TRANSPORTES */
const CACHE_NAME = 'fr-transportes-v1';
const RUNTIME_CACHE = 'fr-transportes-runtime';

const ESSENTIAL_FILES = [
  '/',
  '/index.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ESSENTIAL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
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
  if (!event.request.url.startsWith(self.location.origin)) return;

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
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === 'navigate') return caches.match('/');
        });
      })
  );
});

self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) data = event.data.json();

  const title = data.title || 'FR TRANSPORTES';
  const options = {
    body: data.body || 'Nova notificação',
    icon: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f81f10a039cb25fee3024b/1597e9e5a_logofundopreto.png',
    badge: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f81f10a039cb25fee3024b/1597e9e5a_logofundopreto.png',
    vibrate: data.vibrate || [200, 100, 200],
    data: data.data || {},
    tag: data.tag || 'default',
    requireInteraction: data.requireInteraction || false
  };

  if (data.sound) {
    self.clients.matchAll().then((clientList) => {
      clientList.forEach((client) => {
        client.postMessage({ type: 'PLAY_SOUND', sound: data.sound });
      });
    });
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (let client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(urlToOpen);
    })
  );
});`;

  const indexHtmlCode = `<!-- Adicionar no <head> do index.html -->
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#00ff66">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="FR TRANSPORTES">
<link rel="apple-touch-icon" href="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f81f10a039cb25fee3024b/1597e9e5a_logofundopreto.png">`;

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-6 space-y-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
          <Download className="w-10 h-10 text-green-500" />
          Configuração PWA FR TRANSPORTES
        </h1>
        <p className="text-gray-400 mb-8">Siga as instruções abaixo para ativar o PWA completamente</p>

        {/* Checklist */}
        <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-2 border-green-500/30 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
              Checklist de Configuração
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-white">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-black font-bold">1</div>
              <span>Criar arquivo <code className="bg-black/30 px-2 py-1 rounded">public/manifest.json</code></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-black font-bold">2</div>
              <span>Criar arquivo <code className="bg-black/30 px-2 py-1 rounded">public/service-worker.js</code></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-black font-bold">3</div>
              <span>Adicionar tags no <code className="bg-black/30 px-2 py-1 rounded">index.html</code></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-black font-bold">4</div>
              <span>Criar pasta <code className="bg-black/30 px-2 py-1 rounded">public/sounds/</code> e adicionar arquivos de áudio</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-black font-bold">5</div>
              <span>Testar em HTTPS ou localhost</span>
            </div>
          </CardContent>
        </Card>

        {/* Passo 1: manifest.json */}
        <Card className="bg-gray-800/50 border-2 border-green-500/20 mb-6">
          <CardHeader className="border-b border-green-500/20">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-500" />
                1. public/manifest.json
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(manifestCode, "manifest.json")}
                className="gap-2 border-green-500/30 text-green-400 hover:bg-green-500/10"
              >
                <Copy className="w-4 h-4" />
                Copiar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <pre className="bg-black/50 p-4 rounded-lg overflow-x-auto text-sm text-gray-300 border border-gray-700">
              <code>{manifestCode}</code>
            </pre>
          </CardContent>
        </Card>

        {/* Passo 2: service-worker.js */}
        <Card className="bg-gray-800/50 border-2 border-green-500/20 mb-6">
          <CardHeader className="border-b border-green-500/20">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-500" />
                2. public/service-worker.js
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(serviceWorkerCode, "service-worker.js")}
                className="gap-2 border-green-500/30 text-green-400 hover:bg-green-500/10"
              >
                <Copy className="w-4 h-4" />
                Copiar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <pre className="bg-black/50 p-4 rounded-lg overflow-x-auto text-sm text-gray-300 border border-gray-700 max-h-96">
              <code>{serviceWorkerCode}</code>
            </pre>
          </CardContent>
        </Card>

        {/* Passo 3: index.html */}
        <Card className="bg-gray-800/50 border-2 border-green-500/20 mb-6">
          <CardHeader className="border-b border-green-500/20">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-500" />
                3. Tags no index.html
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(indexHtmlCode, "Tags HTML")}
                className="gap-2 border-green-500/30 text-green-400 hover:bg-green-500/10"
              >
                <Copy className="w-4 h-4" />
                Copiar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <pre className="bg-black/50 p-4 rounded-lg overflow-x-auto text-sm text-gray-300 border border-gray-700">
              <code>{indexHtmlCode}</code>
            </pre>
          </CardContent>
        </Card>

        {/* Passo 4: Arquivos de Som */}
        <Card className="bg-gray-800/50 border-2 border-yellow-500/20 mb-6">
          <CardHeader className="border-b border-yellow-500/20">
            <CardTitle className="text-white flex items-center gap-2">
              <Music className="w-5 h-5 text-yellow-500" />
              4. Arquivos de Som
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <Alert className="border-yellow-500/30 bg-yellow-500/10">
              <Info className="w-5 h-5 text-yellow-500" />
              <AlertDescription className="text-white">
                <p className="font-bold mb-2">Criar pasta public/sounds/ e adicionar:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li><code className="bg-black/30 px-2 py-1 rounded">notificacao1.mp3</code> - Novo serviço</li>
                  <li><code className="bg-black/30 px-2 py-1 rounded">alerta.mp3</code> - Serviço urgente</li>
                  <li><code className="bg-black/30 px-2 py-1 rounded">notificacao2.mp3</code> - Serviço concluído</li>
                  <li><code className="bg-black/30 px-2 py-1 rounded">notificacao3.mp3</code> - Agendamento</li>
                  <li><code className="bg-black/30 px-2 py-1 rounded">notificacao4.mp3</code> - Conta vencendo</li>
                  <li><code className="bg-black/30 px-2 py-1 rounded">ping.mp3</code> - Mensagem</li>
                </ul>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Passo 5: Teste */}
        <Card className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-2 border-blue-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-blue-500" />
              5. Testar o PWA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-white">
            <p>✅ Acesse o sistema em <strong>HTTPS</strong> ou <strong>localhost</strong></p>
            <p>✅ Abra o DevTools (F12) → Application → Service Workers</p>
            <p>✅ Verifique se o service worker está registrado e ativo</p>
            <p>✅ O botão de instalação deve aparecer no canto inferior direito</p>
            <p>✅ Após instalar, o app abre em tela cheia sem barra de endereço</p>
            <p>✅ Notificações funcionam em tempo real</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}