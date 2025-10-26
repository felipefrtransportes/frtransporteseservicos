

import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import {
  LayoutDashboard,
  Users,
  Truck,
  FileText,
  Calendar,
  DollarSign,
  BarChart3,
  UserCog,
  PackageSearch,
  LogOut,
  Bell,
  Wallet,
  CheckCircle,
  Sun,
  Moon,
  AlertCircle
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { userHasPermission, SYSTEM_PAGES } from "@/components/utils/pages";
import InstallPWA from "@/components/pwa/InstallPWA";
import NotificationManager from "@/components/pwa/NotificationManager";
import { useNotifications } from "@/components/pwa/useNotifications";
import PWAInitializer from "@/components/pwa_temp/PWAInitializer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";

export default function Layout({ children }) {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  // Hook de notificações
  useNotifications(user);

  const { data: servicos = [] } = useQuery({
    queryKey: ['servicos-notificacoes'],
    queryFn: () => base44.entities.Servico.list('-created_date'),
    enabled: !!user,
    refetchInterval: 5000
  });

  // Carregar preferência de tema
  useEffect(() => {
    const savedTheme = localStorage.getItem('fr-theme');
    if (savedTheme) {
      setDarkMode(savedTheme === 'dark');
    }
  }, []);

  // Aplicar tema ao document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
    localStorage.setItem('fr-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Erro ao carregar usuário:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, []);

  const handleLogout = () => {
    base44.auth.logout();
  };

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  const calcularAgendamentos = () => {
    if (!user?.prestador_id || !servicos.length) return 0;
    
    const agora = new Date();
    return servicos.filter(s => {
      if (s.prestador_id !== user.prestador_id) return false;
      if (!s.agendado || !s.data_agendamento) return false;
      
      const dataAgendamento = new Date(s.data_agendamento);
      const umaHoraAntes = new Date(dataAgendamento.getTime() - 60 * 60000);
      
      return agora < umaHoraAntes;
    }).length;
  };

  const agendamentosCount = calcularAgendamentos();

  const adminMenuItems = [
    {
      title: "Dashboard",
      url: createPageUrl("Dashboard"),
      icon: LayoutDashboard,
    },
    {
      title: "Diagnóstico",
      url: createPageUrl("DiagnosticoSistema"),
      icon: AlertCircle,
    },
    {
      title: "Clientes",
      url: createPageUrl("Clientes"),
      icon: Users,
    },
    {
      title: "Prestadores",
      url: createPageUrl("Prestadores"),
      icon: Truck,
    },
    {
      title: "Serviços",
      url: createPageUrl("Servicos"),
      icon: FileText,
    },
    {
      title: "Agendamentos",
      url: createPageUrl("Agendamentos"),
      icon: Calendar,
    },
    {
      title: "Faturado",
      url: createPageUrl("Faturado"),
      icon: FileText,
    },
    {
      title: "Caixa Prestadores",
      url: createPageUrl("CaixaPrestadores"),
      icon: Wallet,
    },
    {
      title: "Financeiro",
      url: createPageUrl("Financeiro"),
      icon: DollarSign,
    },
    {
      title: "Relatórios",
      url: createPageUrl("Relatorios"),
      icon: BarChart3,
    },
    {
      title: "Usuários",
      url: createPageUrl("Usuarios"),
      icon: UserCog,
    },
  ];

  const prestadorMenuItems = [
    {
      title: "Meus Fretes",
      url: createPageUrl("MeusFretes"),
      icon: PackageSearch,
    },
    {
      title: "Agendamentos",
      url: createPageUrl("Agendamentos"),
      icon: Calendar,
      badge: agendamentosCount > 0 ? agendamentosCount : null
    },
    {
      title: "Serviços Concluídos",
      url: createPageUrl("ServicosConcluidos"),
      icon: CheckCircle,
    },
    {
      title: "Relatórios Prestador",
      url: createPageUrl("RelatoriosPrestador"),
      icon: BarChart3,
    },
  ];

  let menuItems = [];
  
  if (user) {
    const tipos = user.tipos_usuario || [];
    const permissoes = user.permissoes || [];
    
    if (tipos.includes("Administrador")) {
      // Se tem permissões customizadas, usar apenas elas
      if (permissoes.length > 0) {
        menuItems = adminMenuItems.filter(item => permissoes.includes(item.title));
      } else {
        // Sem permissões customizadas = acesso total
        menuItems = adminMenuItems;
      }
    }
    
    if (tipos.includes("Prestador")) {
      // Se tem permissões customizadas, usar apenas elas
      if (permissoes.length > 0) {
        const prestadorPermitidos = prestadorMenuItems.filter(item => permissoes.includes(item.title));
        menuItems = [...menuItems, ...prestadorPermitidos];
      } else {
        // Sem permissões customizadas = páginas padrão de prestador
        menuItems = [...menuItems, ...prestadorMenuItems];
      }
    }
    
    // Remover duplicatas mantendo a primeira ocorrência
    menuItems = Array.from(new Map(menuItems.map(item => [item.title, item])).values());
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f0f0f] to-[#1c1c1c]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00ff66]"></div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      {/* PWA Initializer */}
      <PWAInitializer />
      
      <style>{`
        /* Dark Mode Variables */
        .dark {
          --bg-primary: #0f0f0f;
          --bg-secondary: #1c1c1c;
          --bg-tertiary: #2a2a2a;
          --text-primary: #ffffff;
          --text-secondary: #e5e5e5;
          --text-muted: #a0a0a0;
          --accent-primary: #00ff66;
          --accent-secondary: #00cc52;
          --accent-hover: #00ff6620;
          --border-color: #333333;
          --card-bg: #1a1a1a;
        }

        /* Light Mode Variables */
        .light {
          --bg-primary: #ffffff;
          --bg-secondary: #f5f5f5;
          --bg-tertiary: #e0e0e0;
          --text-primary: #1a1a1a;
          --text-secondary: #333333;
          --text-muted: #666666;
          --accent-primary: #00ff66;
          --accent-secondary: #00cc52;
          --accent-hover: #00ff6610;
          --border-color: #e0e0e0;
          --card-bg: #ffffff;
        }

        :root {
          --primary: 0 255 102;
          --primary-foreground: 0 0 0;
          --secondary: 0 204 82;
          --secondary-foreground: 255 255 255;
          --accent: 0 255 102;
          --accent-foreground: 0 0 0;
          --success: 0 255 102;
          --warning: 234 179 8;
          --danger: 239 68 68;
          --ring: 0 255 102;
        }

        .dark {
          --background: 15 15 15;
          --foreground: 255 255 255;
          --card: 26 26 26;
          --card-foreground: 255 255 255;
          --popover: 26 26 26;
          --popover-foreground: 255 255 255;
          --muted: 42 42 42;
          --muted-foreground: 160 160 160;
          --border: 51 51 51;
          --input: 42 42 42;
        }

        .light {
          --background: 255 255 255;
          --foreground: 26 26 26;
          --card: 255 255 255;
          --card-foreground: 26 26 26;
          --popover: 255 255 255;
          --popover-foreground: 26 26 26;
          --muted: 245 245 245;
          --muted-foreground: 102 102 102;
          --border: 224 224 224;
          --input: 224 224 224;
        }

        /* Animações de hover suaves */
        .menu-item-hover {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .menu-item-hover:hover {
          transform: translateX(4px);
          box-shadow: 0 0 20px rgba(0, 255, 102, 0.3);
        }

        .icon-glow {
          filter: drop-shadow(0 0 8px rgba(0, 255, 102, 0.5));
        }

        /* Scrollbar personalizada */
        .dark ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .dark ::-webkit-scrollbar-track {
          background: #1c1c1c;
        }

        .dark ::-webkit-scrollbar-thumb {
          background: #00ff66;
          border-radius: 4px;
        }

        .dark ::-webkit-scrollbar-thumb:hover {
          background: #00cc52;
        }
      `}</style>
      
      <div className="min-h-screen flex w-full" style={{ background: darkMode ? 'linear-gradient(to bottom right, #0f0f0f, #1c1c1c)' : 'linear-gradient(to bottom right, #f5f5f5, #ffffff)' }}>
        <Sidebar 
          className="border-r backdrop-blur-sm" 
          style={{ 
            borderColor: 'var(--border-color)',
            background: darkMode ? 'rgba(26, 26, 26, 0.95)' : 'rgba(255, 255, 255, 0.95)'
          }}
        >
          <SidebarHeader 
            className="border-b p-6" 
            style={{ 
              borderColor: 'var(--border-color)',
              background: darkMode ? '#0f0f0f' : '#ffffff'
            }}
          >
            <div className="flex items-center gap-3">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f81f10a039cb25fee3024b/1597e9e5a_logofundopreto.png"
                alt="FR Transportes"
                className="w-12 h-12 object-contain icon-glow"
              />
              <div>
                <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                  FR Transportes
                </h2>
                <p className="text-xs" style={{ color: '#00ff66' }}>
                  & Serviços
                </p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-3">
            <SidebarGroup>
              <SidebarGroupLabel 
                className="text-xs font-semibold uppercase tracking-wider px-3 py-2"
                style={{ color: 'var(--text-muted)' }}
              >
                Menu Principal
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`menu-item-hover rounded-xl mb-1 ${
                          location.pathname === item.url 
                            ? 'shadow-lg' 
                            : ''
                        }`}
                        style={{
                          background: location.pathname === item.url 
                            ? 'linear-gradient(to right, #00ff66, #00cc52)' 
                            : 'transparent',
                          color: location.pathname === item.url 
                            ? '#000000' 
                            : 'var(--text-secondary)',
                          boxShadow: location.pathname === item.url 
                            ? '0 0 20px rgba(0, 255, 102, 0.5)' 
                            : 'none'
                        }}
                        onMouseEnter={(e) => {
                          if (location.pathname !== item.url) {
                            e.currentTarget.style.background = 'var(--accent-hover)';
                            e.currentTarget.style.color = '#00ff66';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (location.pathname !== item.url) {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--text-secondary)';
                          }
                        }}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
                          <item.icon className="w-5 h-5" />
                          <span className="font-medium flex-1">{item.title}</span>
                          {item.badge && (
                            <Badge style={{ background: '#00ff66', color: '#000000' }}>
                              {item.badge}
                            </Badge>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                  
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      onClick={handleLogout}
                      className="menu-item-hover rounded-xl mt-4"
                      style={{ color: 'var(--text-secondary)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                        e.currentTarget.style.color = '#ef4444';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                      }}
                    >
                      <div className="flex items-center gap-3 px-4 py-3">
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">Sair</span>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="mt-auto">
              <div 
                className="px-4 py-3 rounded-xl border"
                style={{
                  background: darkMode ? 'rgba(0, 255, 102, 0.1)' : 'rgba(0, 255, 102, 0.05)',
                  borderColor: 'rgba(0, 255, 102, 0.2)'
                }}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
                    style={{
                      background: 'linear-gradient(to right, #00ff66, #00cc52)',
                      boxShadow: '0 0 20px rgba(0, 255, 102, 0.5)'
                    }}
                  >
                    <span className="text-black font-bold text-sm">
                      {user?.full_name?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                      {user?.full_name || 'Usuário'}
                    </p>
                    <p className="text-xs truncate" style={{ color: '#00ff66' }}>
                      {user?.tipos_usuario?.join(", ") || 'Usuário'}
                    </p>
                  </div>
                </div>
              </div>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 flex flex-col overflow-hidden">
          <header 
            className="border-b px-4 md:px-8 py-4 shadow-lg backdrop-blur-sm"
            style={{
              background: darkMode ? 'rgba(26, 26, 26, 0.95)' : 'rgba(255, 255, 255, 0.95)',
              borderColor: 'var(--border-color)'
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <SidebarTrigger 
                  className="md:hidden p-2 rounded-lg transition-colors duration-200"
                  style={{ color: '#00ff66' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                />
                <h1 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {menuItems.find(item => item.url === location.pathname)?.title || 'FR Transportes'}
                </h1>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Toggle Theme Button */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleTheme}
                  className="rounded-lg transition-all duration-300"
                  style={{
                    borderColor: '#00ff66',
                    color: '#00ff66',
                    background: 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--accent-hover)';
                    e.currentTarget.style.transform = 'rotate(180deg)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.transform = 'rotate(0deg)';
                  }}
                >
                  {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </Button>

                {agendamentosCount > 0 && user?.tipos_usuario?.includes("Prestador") && (
                  <Link to={createPageUrl("Agendamentos")}>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="relative"
                      style={{ color: '#00ff66' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <Bell className="w-5 h-5" />
                      <Badge 
                        className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs"
                        style={{ background: '#00ff66', color: '#000000' }}
                      >
                        {agendamentosCount}
                      </Badge>
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </header>

          <div 
            className="flex-1 overflow-auto"
            style={{ background: darkMode ? 'linear-gradient(to bottom right, #0f0f0f, #1c1c1c)' : 'linear-gradient(to bottom right, #f5f5f5, #ffffff)' }}
          >
            {children}
          </div>
        </main>

        {/* Componentes PWA */}
        <InstallPWA />
        <NotificationManager user={user} />
        
        {/* Menu Mobile Inferior */}
        <MobileBottomNav user={user} />
      </div>
    </SidebarProvider>
  );
}

