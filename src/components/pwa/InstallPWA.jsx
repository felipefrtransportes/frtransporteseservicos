import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, CheckCircle, Smartphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Verificar se já está instalado
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      setIsInstalled(true);
      return;
    }

    // Escutar evento de instalação
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      console.log('[PWA] beforeinstallprompt event fired');
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Detectar quando foi instalado
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App foi instalado');
      setIsInstalled(true);
      setShowInstallButton(false);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 5000);
    });

    // Mostrar botão após delay se o evento não disparar (alguns navegadores)
    const timer = setTimeout(() => {
      if (!isInstalled && !showInstallButton && !window.matchMedia('(display-mode: standalone)').matches) {
        console.log('[PWA] Mostrando botão de instalação por timeout');
        setShowInstallButton(true);
      }
    }, 3000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearTimeout(timer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Se não há prompt, mostrar instruções manuais
      alert('Para instalar:\n\n' +
        '📱 Android Chrome: Menu (⋮) → "Adicionar à tela inicial"\n' +
        '🍎 iOS Safari: Compartilhar → "Adicionar à Tela de Início"\n' +
        '💻 Desktop: Ícone de instalação na barra de endereço');
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('[PWA] Instalação aceita');
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 5000);
    } else {
      console.log('[PWA] Instalação recusada');
    }

    setDeferredPrompt(null);
    setShowInstallButton(false);
  };

  if (isInstalled) return null;

  return (
    <>
      {/* ✅ Botão de Instalação Flutuante - OCULTADO VISUALMENTE */}
      <AnimatePresence>
        {showInstallButton && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            style={{
              position: 'fixed',
              bottom: '20px',
              right: '20px',
              zIndex: 9999,
              display: 'none' // ✅ OCULTO - Funcionalidade mantida, apenas invisível
            }}
          >
            <Button
              onClick={handleInstallClick}
              className="relative group shadow-2xl"
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #00ff66, #00cc52)',
                boxShadow: '0 4px 20px rgba(0, 255, 102, 0.6), 0 0 40px rgba(0, 255, 102, 0.3)',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'pulse 2s infinite'
              }}
            >
              <Download className="w-6 h-6 text-black group-hover:animate-bounce" />
              
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 hidden group-hover:block">
                <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-xl">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-3 h-3" />
                    <span>Instalar FR TRANSPORTES</span>
                  </div>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            </Button>

            <style>{`
              @keyframes pulse {
                0%, 100% {
                  box-shadow: 0 4px 20px rgba(0, 255, 102, 0.6), 0 0 40px rgba(0, 255, 102, 0.3);
                }
                50% {
                  box-shadow: 0 4px 30px rgba(0, 255, 102, 0.8), 0 0 60px rgba(0, 255, 102, 0.5);
                }
              }
            `}</style>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mensagem de Sucesso */}
      <AnimatePresence>
        {showSuccessMessage && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              zIndex: 10000
            }}
          >
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl shadow-2xl p-4 flex items-center gap-3 max-w-sm">
              <CheckCircle className="w-6 h-6 flex-shrink-0" />
              <div>
                <p className="font-bold">✅ App instalado!</p>
                <p className="text-sm opacity-90">FR TRANSPORTES pronto para usar</p>
              </div>
              <button
                onClick={() => setShowSuccessMessage(false)}
                className="ml-auto text-white/80 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}