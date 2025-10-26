import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  CheckCircle,
  PackageSearch,
  BarChart3,
  Calendar,
  LayoutDashboard,
  Users,
  Truck,
  FileText,
  DollarSign,
  UserCog,
  Wallet
} from "lucide-react";

export default function MobileBottomNav({ user }) {
  const location = useLocation();

  // Verificar se é prestador e admin
  const isPrestador = user?.tipos_usuario?.includes("Prestador");
  const isAdmin = user?.tipos_usuario?.includes("Administrador");

  // Se não é prestador, não mostra o menu
  if (!isPrestador) return null;

  // ✅ NOVA ORDEM: Ícones fixos do prestador
  const prestadorMenus = [
    {
      title: "Concluídos",
      url: createPageUrl("ServicosConcluidos"),
      icon: CheckCircle,
      color: "text-gray-400"
    },
    {
      title: "Meus Fretes",
      url: createPageUrl("MeusFretes"),
      icon: PackageSearch,
      color: "text-green-500",
      highlight: true
    },
    {
      title: "Agendamentos",
      url: createPageUrl("Agendamentos"),
      icon: Calendar,
      color: "text-purple-400",
      highlightPurple: true
    },
    {
      title: "Relatórios",
      url: createPageUrl("RelatoriosPrestador"),
      icon: BarChart3,
      color: "text-gray-400"
    }
  ];

  // Menus extras para admin
  const adminMenus = isAdmin ? [
    {
      title: "Dashboard",
      url: createPageUrl("Dashboard"),
      icon: LayoutDashboard
    },
    {
      title: "Clientes",
      url: createPageUrl("Clientes"),
      icon: Users
    },
    {
      title: "Prestadores",
      url: createPageUrl("Prestadores"),
      icon: Truck
    },
    {
      title: "Serviços",
      url: createPageUrl("Servicos"),
      icon: FileText
    },
    {
      title: "Caixa",
      url: createPageUrl("CaixaPrestadores"),
      icon: Wallet
    },
    {
      title: "Financeiro",
      url: createPageUrl("Financeiro"),
      icon: DollarSign
    },
    {
      title: "Relatórios Adm",
      url: createPageUrl("Relatorios"),
      icon: BarChart3
    },
    {
      title: "Usuários",
      url: createPageUrl("Usuarios"),
      icon: UserCog
    }
  ] : [];

  return (
    <>
      <style>{`
        /* Espaçamento para não sobrepor o conteúdo */
        @media (max-width: 767px) {
          main {
            padding-bottom: 80px !important;
          }
        }

        /* Ocultar scrollbar mas manter scroll */
        .mobile-nav-scroll::-webkit-scrollbar {
          display: none;
        }
        
        .mobile-nav-scroll {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        /* Animação de ativo verde */
        .nav-item-active-green {
          animation: pulse-green 2s infinite;
        }

        @keyframes pulse-green {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(0, 255, 102, 0.4);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(0, 255, 102, 0);
          }
        }

        /* Animação de ativo roxo */
        .nav-item-active-purple {
          animation: pulse-purple 2s infinite;
        }

        @keyframes pulse-purple {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(168, 85, 247, 0.4);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(168, 85, 247, 0);
          }
        }
      `}</style>

      {/* Menu Mobile - Só aparece em telas pequenas */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-lg border-t border-green-500/20"
           style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        
        {/* Ícones Fixos do Prestador */}
        <div className="flex items-center justify-around px-2 py-3">
          {prestadorMenus.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.url;
            const isHighlight = item.highlight;
            const isHighlightPurple = item.highlightPurple;

            return (
              <Link
                key={item.title}
                to={item.url}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
                  isActive 
                    ? isHighlightPurple
                      ? 'bg-purple-500/20 nav-item-active-purple'
                      : 'bg-green-500/20 nav-item-active-green'
                    : isHighlight
                    ? 'bg-green-500/10'
                    : isHighlightPurple
                    ? 'bg-purple-500/10'
                    : 'hover:bg-gray-800/50'
                }`}
              >
                <Icon 
                  className={`w-6 h-6 ${
                    isActive 
                      ? isHighlightPurple
                        ? 'text-purple-400'
                        : 'text-green-400'
                      : isHighlight
                      ? 'text-green-500'
                      : isHighlightPurple
                      ? 'text-purple-400'
                      : 'text-gray-400'
                  }`}
                />
                <span className={`text-[10px] font-medium ${
                  isActive 
                    ? isHighlightPurple
                      ? 'text-purple-400'
                      : 'text-green-400'
                    : isHighlight
                    ? 'text-green-500'
                    : isHighlightPurple
                    ? 'text-purple-400'
                    : 'text-gray-400'
                }`}>
                  {item.title}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Menus Admin com Scroll Lateral */}
        {isAdmin && adminMenus.length > 0 && (
          <div className="border-t border-green-500/10 px-2 py-2">
            <div className="flex items-center gap-1 overflow-x-auto mobile-nav-scroll pb-1">
              {adminMenus.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.url;

                return (
                  <Link
                    key={item.title}
                    to={item.url}
                    className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all whitespace-nowrap flex-shrink-0 ${
                      isActive 
                        ? 'bg-green-500/20' 
                        : 'hover:bg-gray-800/50'
                    }`}
                  >
                    <Icon 
                      className={`w-5 h-5 ${
                        isActive ? 'text-green-400' : 'text-gray-500'
                      }`}
                    />
                    <span className={`text-[9px] font-medium ${
                      isActive ? 'text-green-400' : 'text-gray-500'
                    }`}>
                      {item.title}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}