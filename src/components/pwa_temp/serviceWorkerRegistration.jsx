// ========================================
// 🟢 SERVICE WORKER COM HEALTH CHECK
// Auto-reparo + Cache otimizado + Notificações
// ========================================

// Função principal para garantir SW saudável
export async function registerServiceWorker() {
  await ensureHealthySW();
}

async function ensureHealthySW() {
  try {
    if (!('serviceWorker' in navigator)) {
      console.log('[PWA] ❌ Service Worker não suportado neste navegador');
      return;
    }

    const regs = await navigator.serviceWorker.getRegistrations();
    let healthy = false;

    // ========================================
    // 1. VERIFICAR SE SW ATUAL ESTÁ SAUDÁVEL
    // ========================================
    if (regs && regs.length) {
      const reg = regs[0];
      const sw = reg.active || reg.waiting || reg.installing;
      
      healthy = await new Promise((resolve) => {
        try {
          if (!sw) return resolve(false);
          
          const channel = new MessageChannel();
          const timer = setTimeout(() => resolve(false), 1200); // 1.2 segundos timeout
          
          channel.port1.onmessage = (ev) => {
            clearTimeout(timer);
            resolve(ev?.data === 'PONG');
          };
          
          sw.postMessage('PING', [channel.port2]);
        } catch (_) {
          resolve(false);
        }
      });

      // Se não está saudável, desregistrar
      if (!healthy) {
        try {
          await reg.unregister();
          console.log('[PWA] 🗑️ SW inválido desregistrado.');
        } catch (_) {}
      } else {
        console.log('[PWA] ✅ SW atual aprovado no health-check.');
      }
    }

    // ========================================
    // 2. SE NÃO HÁ SW SAUDÁVEL, REGISTRAR NOVO
    // ========================================
    if (!healthy) {
      const swCode = `
        const V = 'fr-sw-v2.3';
        const LIMIT = 60;
        const STATIC = ['/', '/index.html']; // sem forçar manifest aqui

        // ========================================
        // INSTALAÇÃO
        // ========================================
        self.addEventListener('install', (e) => {
          console.log('[SW] 🔧 Instalando SW dinâmico v2.3...');
          self.skipWaiting();
          e.waitUntil((async () => {
            try {
              const c = await caches.open(V);
              await c.addAll(STATIC);
              console.log('[SW] ✅ Cache inicial criado');
            } catch (err) {
              console.warn('[SW] ⚠️ Erro ao criar cache inicial:', err);
            }
          })());
        });

        // ========================================
        // ATIVAÇÃO
        // ========================================
        self.addEventListener('activate', (e) => {
          console.log('[SW] ⚡ Ativando SW dinâmico...');
          e.waitUntil((async () => {
            try {
              await clients.claim();
              const names = await caches.keys();
              await Promise.all(names.map(n => n !== V && caches.delete(n)));
              console.log('[SW] ✅ Caches antigos removidos');
            } catch (err) {
              console.warn('[SW] ⚠️ Erro na ativação:', err);
            }
          })());
        });

        // ========================================
        // MENSAGENS (PING/PONG + COMANDOS)
        // ========================================
        self.addEventListener('message', (e) => {
          try {
            // Health check
            if (e.data === 'PING' && e.ports?.[0]) {
              e.ports[0].postMessage('PONG');
            }
            
            // Comandos
            if (e.data?.type === 'SKIP_WAITING') {
              self.skipWaiting();
            }
            
            if (e.data?.type === 'CHECK_UPDATE') {
              self.registration.update();
            }
            
            if (e.data?.type === 'CLEAR_CACHE') {
              caches.keys().then(names => {
                Promise.all(names.map(name => caches.delete(name)));
              });
            }
          } catch (err) {
            console.warn('[SW] Erro ao processar mensagem:', err);
          }
        });

        // ========================================
        // FETCH (ESTRATÉGIA MISTA)
        // ========================================
        self.addEventListener('fetch', (e) => {
          const req = e.request;
          
          // Ignorar non-GET
          if (req.method !== 'GET') return;
          
          // Ignorar non-HTTP
          if (!req.url.startsWith('http')) return;
          
          // Ignorar APIs para sempre buscar dados frescos
          if (req.url.includes('/api/') || req.url.includes('supabase')) {
            return;
          }

          // Cache-First para recursos estáticos
          const isStatic = STATIC.some(p => req.url.endsWith(p));
          if (isStatic) {
            e.respondWith((async () => {
              try {
                const cache = await caches.open(V);
                const cached = await cache.match(req);
                
                const net = fetch(req).then(r => {
                  try {
                    if (r && r.status === 200) {
                      cache.put(req, r.clone());
                    }
                  } catch (_) {}
                  return r;
                }).catch(() => cached);
                
                return cached || net;
              } catch (err) {
                return fetch(req);
              }
            })());
            return;
          }

          // Network-First com cache dinâmico limitado
          e.respondWith(
            fetch(req).then(res => {
              try {
                if (res && res.status === 200 && (res.type === 'basic' || res.type === 'cors')) {
                  caches.open(V).then(cache => {
                    cache.keys().then(keys => {
                      if (keys.length >= LIMIT) {
                        cache.delete(keys[0]); // Remove mais antigo
                      }
                    });
                    cache.put(req, res.clone());
                  });
                }
              } catch (_) {}
              return res;
            }).catch(() => caches.match(req))
          );
        });

        // ========================================
        // NOTIFICAÇÕES PUSH
        // ========================================
        self.addEventListener('push', (e) => {
          try {
            let data = {};
            if (e.data) {
              try {
                data = e.data.json();
              } catch (_) {
                data = { body: e.data.text() };
              }
            }
            
            const title = data.title || 'FR Transportes';
            const options = {
              body: data.body || 'Nova notificação',
              icon: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f81f10a039cb25fee3024b/1597e9e5a_logofundopreto.png',
              badge: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f81f10a039cb25fee3024b/1597e9e5a_logofundopreto.png',
              vibrate: data.vibrate || [200, 100, 200],
              data: data.data || { dateOfArrival: Date.now(), url: '/' },
              tag: data.tag || 'default',
              requireInteraction: data.requireInteraction || false
            };
            
            e.waitUntil(self.registration.showNotification(title, options));
          } catch (err) {
            console.warn('[SW] Erro ao mostrar notificação:', err);
          }
        });

        // ========================================
        // CLIQUE NA NOTIFICAÇÃO
        // ========================================
        self.addEventListener('notificationclick', (e) => {
          e.notification.close();
          
          const urlToOpen = e.notification.data?.url || '/';
          
          e.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
              // Se já tem janela aberta, foca nela
              for (let client of clientList) {
                if (client.url === urlToOpen && 'focus' in client) {
                  return client.focus();
                }
              }
              
              // Se não tem janela aberta, abre uma nova
              if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
              }
            })
          );
        });

        console.log('[SW] ✅ Service Worker dinâmico carregado v2.3 🚀');
      `;

      // Criar blob e registrar
      const blob = new Blob([swCode], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      
      const registration = await navigator.serviceWorker.register(url);
      console.log('[PWA] ✅ SW dinâmico saudável registrado:', registration);

      // Verificar atualizações a cada 60 minutos
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000);

      // Escutar mudanças de controller
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        console.log('[PWA] 🔄 SW atualizado, recarregando página...');
        window.location.reload();
      });
    }

  } catch (err) {
    console.warn('[PWA] ⚠️ ensureHealthySW aviso:', err);
  }
}

// ========================================
// FUNÇÕES AUXILIARES
// ========================================

// Desregistrar Service Worker (útil para desenvolvimento)
export function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
        console.log('[PWA] 🗑️ Service Worker desregistrado');
      })
      .catch((error) => {
        console.error('[PWA] ❌ Erro ao desregistrar Service Worker:', error);
      });
  }
}

// Limpar cache
export function clearCache() {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
    console.log('[PWA] 🗑️ Solicitação de limpeza de cache enviada');
  }
}

// Verificar status do SW
export async function checkServiceWorkerStatus() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      return {
        active: !!registration.active,
        scope: registration.scope,
        updateViaCache: registration.updateViaCache,
        waiting: !!registration.waiting,
        installing: !!registration.installing
      };
    } catch (error) {
      return { active: false, error: error.message };
    }
  }
  return { active: false, error: 'Service Worker not supported' };
}

// Forçar atualização do SW
export async function updateServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.update();
      console.log('[PWA] 🔄 Verificação de atualização solicitada');
    } catch (error) {
      console.error('[PWA] ❌ Erro ao atualizar SW:', error);
    }
  }
}