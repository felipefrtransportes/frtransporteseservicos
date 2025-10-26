import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Copy, 
  CheckCircle2, 
  Folder, 
  FileText, 
  Music, 
  Download,
  AlertCircle,
  Info,
  Terminal,
  Check
} from "lucide-react";
import { toast } from "sonner";

export default function ConfigurarPWA() {
  const [copiedSections, setCopiedSections] = useState({
    manifest: false,
    serviceWorker: false,
    htmlTags: false,
    registration: false
  });

  const copyToClipboard = (text, section) => {
    navigator.clipboard.writeText(text);
    setCopiedSections({ ...copiedSections, [section]: true });
    toast.success("Código copiado com sucesso!");
    setTimeout(() => {
      setCopiedSections({ ...copiedSections, [section]: false });
    }, 3000);
  };

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

const ESSENTIAL_FILES = ['/', '/index.html'];

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
  console.log('[Service Worker] Push received:', event);
  
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
  console.log('[Service Worker] Notification clicked:', event);
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

  const htmlTags = `<!-- Adicionar dentro do <head> do public/index.html -->
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#00ff66">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="FR TRANSPORTES">
<link rel="apple-touch-icon" href="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f81f10a039cb25fee3024b/1597e9e5a_logofundopreto.png">`;

  const registrationCode = `// Adicionar no final do public/index.html, antes de fechar </body>
<script>
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then((registration) => {
          console.log('Service Worker registrado:', registration);
        })
        .catch((error) => {
          console.error('Erro ao registrar Service Worker:', error);
        });
    });
  }
</script>`;

  const terminalCommands = `# Na raiz do projeto (mesmo nível do package.json)
mkdir -p public/sounds
cd public

# Criar manifest.json
cat > manifest.json << 'EOF'
${manifestCode}
EOF

# Criar service-worker.js
cat > service-worker.js << 'EOF'
${serviceWorkerCode}
EOF

# Baixar sons (você precisa ter os arquivos mp3)
# Coloque os arquivos na pasta public/sounds/:
# - notificacao1.mp3
# - alerta.mp3
# - notificacao2.mp3
# - notificacao3.mp3
# - notificacao4.mp3
# - ping.mp3`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4 md:p-8 space-y-6">
      <div>
        <h2 className="text-4xl font-bold text-white flex items-center gap-3">
          <Download className="w-10 h-10 text-green-500" />
          Configurar PWA FR TRANSPORTES
        </h2>
        <p className="text-gray-400 mt-2">Siga os passos abaixo para ativar o Progressive Web App</p>
      </div>

      {/* Status Alert */}
      <Alert className="bg-blue-500/10 border-blue-500/30">
        <Info className="h-5 w-5 text-blue-500" />
        <AlertDescription className="text-white">
          <strong>Componentes PWA já integrados no sistema:</strong>
          <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
            <li>✅ Botão de instalação (InstallPWA)</li>
            <li>✅ Gerenciador de notificações (NotificationManager)</li>
            <li>✅ Hook de notificações (useNotifications)</li>
            <li>✅ Layout preparado com componentes PWA</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Passo 1: Estrutura de Pastas */}
      <Card className="border-2 border-green-500/20 bg-gray-800/50">
        <CardHeader className="border-b border-green-500/20">
          <CardTitle className="text-white flex items-center gap-2">
            <Folder className="w-6 h-6 text-green-500" />
            Passo 1: Criar Estrutura de Pastas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="bg-gray-900 p-4 rounded-lg border border-green-500/20">
            <pre className="text-green-400 text-sm font-mono overflow-x-auto">
{`📁 seu-projeto/
 ┣ 📁 public/               ← CRIAR ESTA PASTA
 ┃  ┣ 📄 manifest.json
 ┃  ┣ 📄 service-worker.js
 ┃  ┗ 📁 sounds/
 ┃     ┣ notificacao1.mp3
 ┃     ┣ alerta.mp3
 ┃     ┣ notificacao2.mp3
 ┃     ┣ notificacao3.mp3
 ┃     ┣ notificacao4.mp3
 ┃     ┗ ping.mp3
 ┣ 📁 src/
 ┣ 📄 package.json
 ┗ ...`}
            </pre>
          </div>

          <Alert className="bg-yellow-500/10 border-yellow-500/30">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            <AlertDescription className="text-white text-sm">
              A pasta <code className="bg-gray-700 px-2 py-1 rounded">public/</code> deve ser criada <strong>manualmente</strong> na raiz do projeto (mesmo nível do <code className="bg-gray-700 px-2 py-1 rounded">package.json</code>)
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Passo 2: manifest.json */}
      <Card className="border-2 border-green-500/20 bg-gray-800/50">
        <CardHeader className="border-b border-green-500/20">
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-green-500" />
            Passo 2: Criar public/manifest.json
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="bg-gray-900 p-4 rounded-lg border border-green-500/20 relative">
            <pre className="text-green-400 text-xs font-mono overflow-x-auto max-h-64">
              {manifestCode}
            </pre>
            <Button
              onClick={() => copyToClipboard(manifestCode, 'manifest')}
              size="sm"
              className="absolute top-2 right-2 bg-green-500 hover:bg-green-600"
            >
              {copiedSections.manifest ? (
                <><Check className="w-4 h-4 mr-1" /> Copiado!</>
              ) : (
                <><Copy className="w-4 h-4 mr-1" /> Copiar</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Passo 3: service-worker.js */}
      <Card className="border-2 border-green-500/20 bg-gray-800/50">
        <CardHeader className="border-b border-green-500/20">
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-green-500" />
            Passo 3: Criar public/service-worker.js
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="bg-gray-900 p-4 rounded-lg border border-green-500/20 relative">
            <pre className="text-green-400 text-xs font-mono overflow-x-auto max-h-96">
              {serviceWorkerCode}
            </pre>
            <Button
              onClick={() => copyToClipboard(serviceWorkerCode, 'serviceWorker')}
              size="sm"
              className="absolute top-2 right-2 bg-green-500 hover:bg-green-600"
            >
              {copiedSections.serviceWorker ? (
                <><Check className="w-4 h-4 mr-1" /> Copiado!</>
              ) : (
                <><Copy className="w-4 h-4 mr-1" /> Copiar</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Passo 4: Modificar index.html */}
      <Card className="border-2 border-green-500/20 bg-gray-800/50">
        <CardHeader className="border-b border-green-500/20">
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-green-500" />
            Passo 4: Adicionar Tags no public/index.html
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <p className="text-gray-300 text-sm">
            Adicionar dentro do <code className="bg-gray-700 px-2 py-1 rounded">&lt;head&gt;</code>:
          </p>
          <div className="bg-gray-900 p-4 rounded-lg border border-green-500/20 relative">
            <pre className="text-green-400 text-xs font-mono overflow-x-auto">
              {htmlTags}
            </pre>
            <Button
              onClick={() => copyToClipboard(htmlTags, 'htmlTags')}
              size="sm"
              className="absolute top-2 right-2 bg-green-500 hover:bg-green-600"
            >
              {copiedSections.htmlTags ? (
                <><Check className="w-4 h-4 mr-1" /> Copiado!</>
              ) : (
                <><Copy className="w-4 h-4 mr-1" /> Copiar</>
              )}
            </Button>
          </div>

          <p className="text-gray-300 text-sm mt-4">
            Adicionar antes de fechar <code className="bg-gray-700 px-2 py-1 rounded">&lt;/body&gt;</code>:
          </p>
          <div className="bg-gray-900 p-4 rounded-lg border border-green-500/20 relative">
            <pre className="text-green-400 text-xs font-mono overflow-x-auto">
              {registrationCode}
            </pre>
            <Button
              onClick={() => copyToClipboard(registrationCode, 'registration')}
              size="sm"
              className="absolute top-2 right-2 bg-green-500 hover:bg-green-600"
            >
              {copiedSections.registration ? (
                <><Check className="w-4 h-4 mr-1" /> Copiado!</>
              ) : (
                <><Copy className="w-4 h-4 mr-1" /> Copiar</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Passo 5: Sons */}
      <Card className="border-2 border-green-500/20 bg-gray-800/50">
        <CardHeader className="border-b border-green-500/20">
          <CardTitle className="text-white flex items-center gap-2">
            <Music className="w-6 h-6 text-green-500" />
            Passo 5: Adicionar Arquivos de Som
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <p className="text-gray-300 text-sm">
            Baixe ou crie os seguintes arquivos MP3 e coloque em <code className="bg-gray-700 px-2 py-1 rounded">public/sounds/</code>:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { name: "notificacao1.mp3", desc: "Novo serviço" },
              { name: "alerta.mp3", desc: "Urgente" },
              { name: "notificacao2.mp3", desc: "Concluído" },
              { name: "notificacao3.mp3", desc: "Agendado" },
              { name: "notificacao4.mp3", desc: "Vencimento" },
              { name: "ping.mp3", desc: "Mensagem" }
            ].map((sound) => (
              <div key={sound.name} className="bg-gray-900 p-3 rounded-lg border border-green-500/20">
                <Music className="w-5 h-5 text-green-500 mb-2" />
                <p className="text-white text-sm font-mono">{sound.name}</p>
                <p className="text-gray-500 text-xs">{sound.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Atalho Terminal */}
      <Card className="border-2 border-purple-500/20 bg-purple-900/10">
        <CardHeader className="border-b border-purple-500/20">
          <CardTitle className="text-white flex items-center gap-2">
            <Terminal className="w-6 h-6 text-purple-500" />
            Atalho: Comandos de Terminal
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <p className="text-gray-300 text-sm">
            Se preferir, use estes comandos no terminal (na raiz do projeto):
          </p>
          <div className="bg-gray-900 p-4 rounded-lg border border-purple-500/20 relative">
            <pre className="text-purple-400 text-xs font-mono overflow-x-auto max-h-64">
              {terminalCommands}
            </pre>
            <Button
              onClick={() => copyToClipboard(terminalCommands, 'terminal')}
              size="sm"
              className="absolute top-2 right-2 bg-purple-500 hover:bg-purple-600"
            >
              <Copy className="w-4 h-4 mr-1" /> Copiar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Verificação Final */}
      <Card className="border-2 border-green-500/30 bg-gradient-to-r from-green-900/20 to-emerald-900/20">
        <CardHeader className="border-b border-green-500/20">
          <CardTitle className="text-white flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-green-500" />
            Verificação Final
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <p className="text-white font-semibold">Botão de Instalação</p>
                <p className="text-gray-400 text-sm">
                  Um botão verde flutuante deve aparecer no canto inferior direito ao acessar o sistema em HTTPS ou localhost
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <p className="text-white font-semibold">Service Worker Registrado</p>
                <p className="text-gray-400 text-sm">
                  Abra o Console do navegador (F12) e verifique se aparece "Service Worker registrado"
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <p className="text-white font-semibold">Notificações Funcionando</p>
                <p className="text-gray-400 text-sm">
                  Ao criar um novo serviço, deve aparecer uma notificação com som para o prestador
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <p className="text-white font-semibold">App Instalável</p>
                <p className="text-gray-400 text-sm">
                  No Chrome/Edge, deve aparecer um ícone de instalação na barra de endereços
                </p>
              </div>
            </div>
          </div>

          <Alert className="bg-green-500/10 border-green-500/30 mt-4">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <AlertDescription className="text-white">
              <strong>Após criar os arquivos, reinicie o servidor</strong> e acesse o sistema em HTTPS. O PWA estará 100% funcional!
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}