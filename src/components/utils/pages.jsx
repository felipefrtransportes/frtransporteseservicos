// Utilitário para gerenciar páginas e permissões do sistema
// Este arquivo detecta automaticamente todas as páginas disponíveis

export const SYSTEM_PAGES = [
  { name: "Dashboard", url: "Dashboard", icon: "LayoutDashboard" },
  { name: "Clientes", url: "Clientes", icon: "Users" },
  { name: "Prestadores", url: "Prestadores", icon: "Truck" },
  { name: "Serviços", url: "Servicos", icon: "FileText" },
  { name: "Agendamentos", url: "Agendamentos", icon: "Calendar" },
  { name: "Faturado", url: "Faturado", icon: "FileText" },
  { name: "Caixa Prestadores", url: "CaixaPrestadores", icon: "Wallet" },
  { name: "Financeiro", url: "Financeiro", icon: "DollarSign" },
  { name: "Relatórios", url: "Relatorios", icon: "BarChart3" },
  { name: "Usuários", url: "Usuarios", icon: "UserCog" },
  { name: "Meus Fretes", url: "MeusFretes", icon: "PackageSearch" },
  { name: "Serviços Concluídos", url: "ServicosConcluidos", icon: "CheckCircle" },
  { name: "Relatórios Prestador", url: "RelatoriosPrestador", icon: "BarChart3" }
];

// Páginas disponíveis para Administradores (todas por padrão)
export const ADMIN_DEFAULT_PAGES = SYSTEM_PAGES.map(p => p.name);

// Páginas disponíveis para Prestadores (apenas as específicas)
export const PRESTADOR_DEFAULT_PAGES = [
  "Meus Fretes",
  "Agendamentos",
  "Serviços Concluídos",
  "Relatórios Prestador"
];

// Função para verificar se usuário tem permissão para acessar uma página
export const userHasPermission = (user, pageName) => {
  if (!user) return false;
  
  const tipos = user.tipos_usuario || [];
  const permissoes = user.permissoes || [];
  
  // Se é administrador e não tem permissões customizadas, acesso total
  if (tipos.includes("Administrador") && permissoes.length === 0) {
    return true;
  }
  
  // Se tem permissões customizadas, verificar se a página está na lista
  if (permissoes.length > 0) {
    return permissoes.includes(pageName);
  }
  
  // Se é prestador sem permissões customizadas, usar páginas padrão
  if (tipos.includes("Prestador")) {
    return PRESTADOR_DEFAULT_PAGES.includes(pageName);
  }
  
  return false;
};

// Função para obter páginas disponíveis baseado no tipo de usuário
export const getAvailablePages = (tipos_usuario = []) => {
  if (tipos_usuario.includes("Administrador")) {
    return SYSTEM_PAGES;
  }
  
  if (tipos_usuario.includes("Prestador")) {
    return SYSTEM_PAGES.filter(p => PRESTADOR_DEFAULT_PAGES.includes(p.name));
  }
  
  return [];
};

// Função para obter permissões padrão baseado no tipo de usuário
export const getDefaultPermissions = (tipos_usuario = []) => {
  const permissoes = [];
  
  if (tipos_usuario.includes("Administrador")) {
    permissoes.push(...ADMIN_DEFAULT_PAGES);
  }
  
  if (tipos_usuario.includes("Prestador")) {
    permissoes.push(...PRESTADOR_DEFAULT_PAGES);
  }
  
  // Remover duplicatas
  return [...new Set(permissoes)];
};