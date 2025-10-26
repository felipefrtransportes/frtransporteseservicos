import React, { useEffect, useState } from "react";
import { manifest } from "./manifest";
import { registerServiceWorker } from "./serviceWorkerRegistration";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function PWAInitializer() {
  const [status, setStatus] = useState({ type: 'loading', message: 'Inicializando PWA...' });
  const [showStatus, setShowStatus] = useState(true);

  useEffect(() => {
    initializePWA();
  }, []);

  const initializePWA = async () => {
    try {
      // ========================================
      // 🟢 AUDITORIA + AUTO-REPARO DO PWA
      // ========================================
      await ensureManifestAndMeta();

      // 2. Registrar Service Worker
      registerServiceWorker();

      // 3. Solicitar permissão para notificações
      if ('Notification' in window && Notification.permission === 'default') {
        setTimeout(() => {
          Notification.requestPermission().then((permission) => {
            console.log('[PWA] Permissão de notificação:', permission);
          });
        }, 2000);
      }

      setStatus({ type: 'success', message: 'PWA configurado com sucesso!' });
      setTimeout(() => setShowStatus(false), 5000);

    } catch (error) {
      console.error('[PWA] Erro ao inicializar:', error);
      setStatus({ type: 'error', message: 'Erro ao configurar PWA' });
      setTimeout(() => setShowStatus(false), 5000);
    }
  };

  // ========================================
  // FUNÇÃO DE AUTO-REPARO DO PWA
  // ========================================
  async function ensureManifestAndMeta() {
    try {
      const head = document.head || document.getElementsByTagName('head')[0];

      // Helper para criar/atualizar meta
      function setMeta(name, content) {
        let m = document.querySelector(`meta[name="${name}"]`);
        if (!m) {
          m = document.createElement('meta');
          m.setAttribute('name', name);
          head.appendChild(m);
        }
        m.setAttribute('content', content);
      }

      // ========================================
      // 1. GARANTIR META TAGS
      // ========================================
      console.log('[PWA] ✅ Aplicando meta tags...');
      setMeta('theme-color', '#00ff66');
      setMeta('apple-mobile-web-app-capable', 'yes');
      setMeta('apple-mobile-web-app-status-bar-style', 'black-translucent');
      setMeta('apple-mobile-web-app-title', 'FR TRANSPORTES');
      setMeta('mobile-web-app-capable', 'yes');
      setMeta('application-name', 'FR TRANSPORTES');

      // ========================================
      // 2. GERAR ÍCONES VIRTUALMENTE SE NECESSÁRIO
      // ========================================
      async function ensureIcon(path, size) {
        try {
          const res = await fetch(path, { method: 'HEAD' });
          if (res.ok) {
            console.log(`[PWA] ✅ Ícone ${size}x${size} encontrado: ${path}`);
            return path;
          }
        } catch (_) {}
        
        console.log(`[PWA] ⚠️ Ícone ${size}x${size} não encontrado, gerando virtualmente...`);
        
        // Gerar ícone SVG virtual com logo FR
        const svg = `
          <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
            <defs>
              <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#0f0f0f;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#1c1c1c;stop-opacity:1" />
              </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#bgGrad)"/>
            <circle cx="${size/2}" cy="${size/2}" r="${size*0.35}" fill="#00ff66" opacity="0.1"/>
            <text x="50%" y="58%" font-size="${Math.floor(size*0.28)}" text-anchor="middle" fill="#00ff66" font-family="Arial, sans-serif" font-weight="700">FR</text>
            <text x="50%" y="76%" font-size="${Math.floor(size*0.08)}" text-anchor="middle" fill="#00cc52" font-family="Arial, sans-serif" font-weight="600">TRANSPORTES</text>
          </svg>`;
        
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        return URL.createObjectURL(blob);
      }

      const icon192 = await ensureIcon('https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f81f10a039cb25fee3024b/1597e9e5a_logofundopreto.png', 192);
      const icon512 = await ensureIcon('https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f81f10a039cb25fee3024b/1597e9e5a_logofundopreto.png', 512);

      // Adicionar apple-touch-icon
      let appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
      if (!appleIcon) {
        appleIcon = document.createElement('link');
        appleIcon.rel = 'apple-touch-icon';
        head.appendChild(appleIcon);
      }
      appleIcon.href = icon192;

      // ========================================
      // 3. VERIFICAR E CRIAR MANIFEST VIRTUAL
      // ========================================
      console.log('[PWA] 🔍 Verificando manifest...');
      let link = document.querySelector('link[rel="manifest"]');
      let mustCreateVirtual = false;

      if (link && link.href) {
        try {
          const r = await fetch(link.href, { cache: 'no-store' });
          if (!r.ok) {
            console.log('[PWA] ⚠️ Manifest existente retornou erro, criando virtual...');
            mustCreateVirtual = true;
          } else {
            console.log('[PWA] ✅ Manifest existente OK');
          }
        } catch (_) {
          console.log('[PWA] ⚠️ Erro ao carregar manifest, criando virtual...');
          mustCreateVirtual = true;
        }
      } else {
        console.log('[PWA] ⚠️ Manifest não encontrado, criando virtual...');
        mustCreateVirtual = true;
      }

      // Criar manifest virtual se necessário
      if (mustCreateVirtual) {
        const manifestObj = {
          name: "FR TRANSPORTES & Serviços",
          short_name: "FR TRANSPORTES",
          description: "Sistema completo de gestão de transportes e serviços",
          start_url: "/",
          scope: "/",
          display: "standalone",
          orientation: "portrait",
          background_color: "#0f0f0f",
          theme_color: "#00ff66",
          icons: [
            {
              src: icon192,
              sizes: "192x192",
              type: "image/png",
              purpose: "any maskable"
            },
            {
              src: icon512,
              sizes: "512x512",
              type: "image/png",
              purpose: "any maskable"
            }
          ],
          categories: ["business", "productivity"],
          lang: "pt-BR",
          dir: "ltr"
        };

        const blob = new Blob([JSON.stringify(manifestObj)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        if (!link) {
          link = document.createElement('link');
          link.setAttribute('rel', 'manifest');
          head.appendChild(link);
        }
        link.setAttribute('href', url);
        console.log('[PWA] ✅ Manifesto virtual injetado com sucesso!');
      }

      // ========================================
      // 4. SUPRIMIR BALÃO AUTOMÁTICO (MANTENDO INSTALABILIDADE)
      // ========================================
      window.addEventListener('beforeinstallprompt', (e) => {
        try {
          e.preventDefault();
          console.log('[PWA] 🔕 Balão automático de instalação suprimido (app continua instalável via menu)');
          window.__A2HS_SUPPRESSED__ = true;
          // Armazenar o evento para uso posterior (via botão manual)
          window.deferredPWAInstallPrompt = e;
        } catch (_) {}
      }, { once: true });

      console.log('[PWA] ✅ Auto-reparo concluído com sucesso!');

    } catch (err) {
      console.warn('[PWA] ⚠️ ensureManifestAndMeta falhou (continua sem travar):', err);
    }
  }

  if (!showStatus) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 10000,
      maxWidth: '400px',
      width: '90%'
    }}>
      <Alert className={
        status.type === 'success' ? 'bg-green-500/20 border-green-500' :
        status.type === 'error' ? 'bg-red-500/20 border-red-500' :
        'bg-blue-500/20 border-blue-500'
      }>
        <div className="flex items-center gap-2">
          {status.type === 'loading' && <Loader2 className="w-4 h-4 animate-spin" />}
          {status.type === 'success' && <CheckCircle className="w-4 h-4" />}
          {status.type === 'error' && <XCircle className="w-4 h-4" />}
          <AlertDescription>{status.message}</AlertDescription>
        </div>
      </Alert>
    </div>
  );
}