
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  DollarSign,
  FileText,
  AlertCircle,
  Clock,
  Trophy,
  BarChart3,
  CheckCircle2,
  Package,
  XCircle,
  Plus,
  CreditCard,
  Target,
  Calendar as CalendarIcon,
  MapPin,
  User,
  Download,
  Edit,
  Trash2,
  RefreshCw
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, startOfDay, endOfDay, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import ServicoDialog from "@/components/servicos/ServicoDialog";
import EditarServicoDialog from "@/components/servicos/EditarServicoDialog";
import { formatBrasiliaDate, formatDateTime, fromInputDateTimeToISO } from "@/components/utils/dateUtils";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [dialogNovoServico, setDialogNovoServico] = useState(false);
  const [dialogDetalhes, setDialogDetalhes] = useState(false);
  const [dialogEdicao, setDialogEdicao] = useState(false);
  const [servicoEdicao, setServicoEdicao] = useState(null);
  const [servicosDetalhados, setServicosDetalhados] = useState([]);
  const [tituloDetalhes, setTituloDetalhes] = useState("");
  const [erro, setErro] = useState(null);

  const [dialogRecusas, setDialogRecusas] = useState(false);
  const [filtroRecusaPrestador, setFiltroRecusaPrestador] = useState("todos");
  const [filtroRecusaData, setFiltroRecusaData] = useState("");

  const [dialogCancelados, setDialogCancelados] = useState(false);
  const [filtroCanceladoCliente, setFiltroCanceladoCliente] = useState("todos");
  const [filtroCanceladoPrestador, setFiltroCanceladoPrestador] = useState("todos");
  const [filtroCanceladoAutor, setFiltroCanceladoAutor] = useState("todos");
  const [filtroCanceladoDataInicio, setFiltroCanceladoDataInicio] = useState("");
  const [filtroCanceladoDataFim, setFiltroCanceladoDataFim] = useState("");
  const [servicoCanceladoDetalhe, setServicoCanceladoDetalhe] = useState(null);
  const [dialogCancelarServico, setDialogCancelarServico] = useState(false);
  const [servicoParaCancelar, setServicoParaCancelar] = useState(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState("");

  const formatarDataSegura = (data, formatString = 'dd/MM/yyyy') => {
    if (!data) return '-';
    try {
      const dataObj = typeof data === 'string' ? parseISO(data) : new Date(data);
      if (isNaN(dataObj.getTime())) return '-';
      return format(dataObj, formatString, { locale: ptBR });
    } catch (error) {
      console.error('Erro ao formatar data:', error, data);
      return '-';
    }
  };

  const getTodayLocal = () => new Date().toISOString().split('T')[0];
  const [dataInicio, setDataInicio] = useState(getTodayLocal());
  const [dataFim, setDataFim] = useState(getTodayLocal());

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        console.log("🔄 Carregando usuário...");
        const currentUser = await base44.auth.me();

        if (currentUser?.tipos_usuario?.includes("Prestador") &&
            !currentUser?.tipos_usuario?.includes("Administrador")) {
          navigate(createPageUrl("MeusFretes"));
          return;
        }

        setUser(currentUser);
        setErro(null); // Clear error on successful user load
        console.log("✅ Usuário carregado:", currentUser?.email);
      } catch (error) {
        console.error("❌ Erro ao carregar usuário:", error);
        setErro("Erro ao conectar com o servidor. Verifique sua conexão.");
      }
    };
    loadUser();
  }, [navigate]);

  const { data: servicos = [], isLoading: loadingServicos, error: errorServicos, refetch: refetchServicos } = useQuery({
    queryKey: ['servicos'],
    queryFn: async () => {
      try {
        console.log("🔄 Carregando serviços...");
        const data = await base44.entities.Servico.list('-created_date');
        console.log("✅ Serviços carregados:", data?.length || 0);
        setErro(null); // Clear error on successful data load
        return data || [];
      } catch (error) {
        console.error("❌ Erro ao carregar serviços:", error);
        console.error("❌ Detalhes do erro:", error.message, error.response);
        if (error.message?.includes('CORS') || error.message?.includes('blocked')) {
          setErro("🚫 Erro de CORS: Aguardando liberação pelo servidor Base44");
        } else if (error.response?.status === 403) {
          setErro("🔒 Erro 403: Sem permissão para acessar dados");
        } else if (error.response?.status === 500) {
          setErro("⚠️ Erro 500: Problema no servidor");
        } else {
          setErro(`❌ Erro ao carregar serviços: ${error.message}`);
        }
        throw error; // Re-throw to let react-query handle retries
      }
    },
    retry: 5,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff up to 30s
    refetchInterval: 10000, // Refetch every 10 seconds
    staleTime: 5000 // Data is considered fresh for 5 seconds
  });

  const { data: clientes = [], refetch: refetchClientes } = useQuery({
    queryKey: ['clientes'],
    queryFn: async () => {
      try {
        console.log("🔄 Carregando clientes...");
        const data = await base44.entities.Cliente.list();
        console.log("✅ Clientes carregados:", data?.length || 0);
        return data || [];
      } catch (error) {
        console.error("❌ Erro ao carregar clientes:", error);
        throw error;
      }
    },
    retry: 5,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchInterval: 15000,
    staleTime: 10000
  });

  const { data: prestadores = [], refetch: refetchPrestadores } = useQuery({
    queryKey: ['prestadores'],
    queryFn: async () => {
      try {
        console.log("🔄 Carregando prestadores...");
        const data = await base44.entities.Prestador.list();
        console.log("✅ Prestadores carregados:", data?.length || 0);
        return data || [];
      } catch (error) {
        console.error("❌ Erro ao carregar prestadores:", error);
        throw error;
      }
    },
    retry: 5,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchInterval: 15000,
    staleTime: 10000
  });

  const { data: recusas = [], refetch: refetchRecusas } = useQuery({
    queryKey: ['recusas'],
    queryFn: async () => {
      try {
        console.log("🔄 Carregando recusas...");
        const data = await base44.entities.RecusaServico.list('-data_recusa');
        console.log("✅ Recusas carregadas:", data?.length || 0);
        return data || [];
      } catch (error) {
        console.error("❌ Erro ao carregar recusas:", error);
        throw error;
      }
    },
    retry: 5,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchInterval: 15000,
    staleTime: 10000
  });

  const handleRefreshAll = () => {
    console.log("🔄 Atualizando todos os dados...");
    setErro(null); // Clear previous error before retrying
    refetchServicos();
    refetchClientes();
    refetchPrestadores();
    refetchRecusas();
  };

  const marcarPagoMutation = useMutation({
    mutationFn: async (servico) => {
      try {
        const agora = new Date().toISOString();

        const updateData = {
          ...servico,
          status_pagamento: "Pago",
          data_pagamento: agora,
          alterado_por_nome: user?.full_name || "Administrador",
          alterado_por_email: user?.email || "admin@fr.com",
          data_alteracao: agora
        };

        await base44.entities.Servico.update(servico.id, updateData);

        const lancamentos = await base44.entities.Lancamento.filter({ servico_id: servico.id });
        if (lancamentos.length > 0) {
          await base44.entities.Lancamento.update(lancamentos[0].id, {
            status_pagamento: "Recebido",
            data_pagamento: agora
          });
        }

        return updateData;
      } catch (error) {
        console.error("Erro ao marcar como pago:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['servicos']);
      queryClient.invalidateQueries(['lancamentos']);
      alert("✅ Serviço marcado como Pago com sucesso!");
    },
    onError: (error) => {
      alert("❌ Erro ao marcar serviço como pago: " + error.message);
    }
  });

  const editarServicoMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      try {
        const agora = new Date().toISOString();

        data.alterado_por_nome = user?.full_name || "Administrador";
        data.alterado_por_email = user?.email || "admin@fr.com";
        data.data_alteracao = agora;

        if (data.data_agendamento && !data.data_agendamento.includes('Z')) {
          data.data_agendamento = fromInputDateTimeToISO(data.data_agendamento);
        }

        if (data.prestador_id && data.valor_total) {
          const prestador = prestadores.find(p => p.id === data.prestador_id);
          if (prestador) {
            data.comissao_prestador = (data.valor_total * prestador.comissao_percentual) / 100;
          }
        }

        const servico = await base44.entities.Servico.update(id, data);

        const servicoOriginal = servicos.find(s => s.id === id);
        if (servicoOriginal && servicoOriginal.valor_total !== data.valor_total) {
          try {
            const lancamentos = await base44.entities.Lancamento.filter({ servico_id: id });
            if (lancamentos.length > 0) {
              await base44.entities.Lancamento.update(lancamentos[0].id, {
                valor: data.valor_total
              });
            }

            const lancamentosPrest = await base44.entities.LancamentoPrestador.filter({ servico_id: id });
            if (lancamentosPrest.length > 0 && data.comissao_prestador) {
              await base44.entities.LancamentoPrestador.update(lancamentosPrest[0].id, {
                valor: data.comissao_prestador
              });
            }
          } catch (error) {
            console.error("Erro ao atualizar lançamentos:", error);
          }
        }

        return servico;
      } catch (error) {
        console.error("Erro ao editar serviço:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['servicos']);
      queryClient.invalidateQueries(['lancamentos']);
      queryClient.invalidateQueries(['lancamentosprestador']);
      setDialogEdicao(false);
      setServicoEdicao(null);
      // ✅ Removido o alert de sucesso
    },
    onError: (error) => {
      alert("❌ Erro ao editar serviço: " + error.message);
    }
  });

  const deletarServicoMutation = useMutation({
    mutationFn: async (servicoId) => {
      try {
        const servico = servicos.find(s => s.id === servicoId);
        if (!servico) throw new Error("Serviço não encontrado");
        
        console.log(`🗑️ [Dashboard] Deletando OS #${servico.numero_pedido}`);
        
        const lancamentos = await base44.entities.Lancamento.filter({ servico_id: servicoId });
        for (const lanc of lancamentos) {
          await base44.entities.Lancamento.delete(lanc.id);
        }
        
        const lancamentosPrest = await base44.entities.LancamentoPrestador.filter({ servico_id: servicoId });
        for (const lancamentoPrestador of lancamentosPrest) {
          await base44.entities.LancamentoPrestador.delete(lancamentoPrestador.id);
        }
        
        if (servico.fechamento_id) {
          const fechamento = await base44.entities.Fechamento.get(servico.fechamento_id);
          if (fechamento) {
            const novosServicosIds = (fechamento.servicos_ids || []).filter(sid => sid !== servicoId);
            
            if (novosServicosIds.length === 0) {
              if (fechamento.lancamento_financeiro_id) {
                await base44.entities.Lancamento.delete(fechamento.lancamento_financeiro_id);
              }
              await base44.entities.Fechamento.delete(fechamento.id);
            } else {
              const servicosRestantes = servicos.filter(s => novosServicosIds.includes(s.id));
              const novoValor = servicosRestantes.reduce((sum, s) => sum + (s.valor_total || 0), 0);
              
              await base44.entities.Fechamento.update(fechamento.id, {
                servicos_ids: novosServicosIds,
                quantidade_servicos: novosServicosIds.length,
                valor_total: novoValor
              });
              
              if (fechamento.lancamento_financeiro_id) {
                await base44.entities.Lancamento.update(fechamento.lancamento_financeiro_id, {
                  valor: novoValor
                });
              }
            }
          }
        }
        
        await base44.entities.Servico.delete(servicoId);
        
        console.log(`✅ [Dashboard] Serviço deletado com sucesso`);
        return servicoId;
      } catch (error) {
        console.error("❌ [Dashboard] Erro ao deletar:", error);
        throw error;
      }
    },
    onSuccess: () => {
      setTimeout(() => {
        queryClient.invalidateQueries(['servicos']);
        queryClient.invalidateQueries(['lancamentos']);
        queryClient.invalidateQueries(['lancamentosprestador']);
        queryClient.invalidateQueries(['fechamentos']);
      }, 300);
      
      alert("✅ Serviço excluído com sucesso!");
    },
    onError: (error) => {
      alert("❌ Erro ao excluir serviço: " + error.message);
    }
  });


  const cancelarServicoMutation = useMutation({
    mutationFn: async ({ servico, motivo }) => {
      const agora = new Date().toISOString();
      
      const updateData = {
        ...servico,
        status_servico: "Cancelado",
        valor_original: servico.valor_total,
        comissao_original: servico.comissao_prestador,
        valor_total: 0,
        comissao_prestador: 0,
        motivo_cancelamento: motivo,
        cancelado_por_nome: user?.full_name || "Administrador",
        cancelado_por_email: user?.email || "admin@fr.com",
        data_cancelamento: agora,
        alterado_por_nome: user?.full_name || "Administrador",
        alterado_por_email: user?.email || "admin@fr.com",
        data_alteracao: agora
      };

      await base44.entities.Servico.update(servico.id, updateData);

      try {
        const lancamentos = await base44.entities.Lancamento.filter({ servico_id: servico.id });
        for (const lanc of lancamentos) {
          await base44.entities.Lancamento.update(lanc.id, { valor: 0 });
        }

        const lancamentosPrest = await base44.entities.LancamentoPrestador.filter({ servico_id: servico.id });
        for (const lancPrest of lancamentosPrest) {
          await base44.entities.LancamentoPrestador.update(lancPrest.id, { valor: 0 });
        }
      } catch (error) {
        console.error("Erro ao atualizar lançamentos:", error);
      }

      return updateData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['servicos']);
      queryClient.invalidateQueries(['lancamentos']);
      queryClient.invalidateQueries(['lancamentosprestador']);
      setDialogCancelarServico(false);
      setServicoParaCancelar(null);
      setMotivoCancelamento("");
      alert("✅ Serviço cancelado e valor zerado com sucesso!");
    },
    onError: (error) => {
      alert("❌ Erro ao cancelar serviço: " + error.message);
    }
  });

  const reativarServicoMutation = useMutation({
    mutationFn: async (servico) => {
      const agora = new Date().toISOString();
      
      const valorOriginal = servico.valor_original || servico.valor_total || 0;
      const comissaoOriginal = servico.comissao_original || servico.comissao_prestador || 0;
      
      const updateData = {
        ...servico,
        status_servico: "Aguardando Aceitação",
        valor_total: valorOriginal,
        comissao_prestador: comissaoOriginal,
        motivo_cancelamento: null,
        cancelado_por_nome: null,
        cancelado_por_email: null,
        data_cancelamento: null,
        alterado_por_nome: user?.full_name || "Administrador",
        alterado_por_email: user?.email || "admin@fr.com",
        data_alteracao: agora
      };

      await base44.entities.Servico.update(servico.id, updateData);

      try {
        const lancamentos = await base44.entities.Lancamento.filter({ servico_id: servico.id });
        for (const lanc of lancamentos) {
          await base44.entities.Lancamento.update(lanc.id, { valor: valorOriginal });
        }

        const lancamentosPrest = await base44.entities.LancamentoPrestador.filter({ servico_id: servico.id });
        for (const lancPrest of lancamentosPrest) {
          await base44.entities.LancamentoPrestador.update(lancPrest.id, { valor: comissaoOriginal });
        }
      } catch (error) {
        console.error("Erro ao restaurar lançamentos:", error);
      }

      return updateData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['servicos']);
      queryClient.invalidateQueries(['lancamentos']);
      queryClient.invalidateQueries(['lancamentosprestador']);
      alert("✅ Serviço reativado com sucesso!");
    },
    onError: (error) => {
      alert("❌ Erro ao reativar serviço: " + error.message);
    }
  });

  const servicosFiltrados = servicos.filter(s => {
    try {
      const serviceCreatedDate = s.created_date ? parseISO(s.created_date) : null;
      if (!serviceCreatedDate || isNaN(serviceCreatedDate.getTime())) return false;
      
      const filterStartDate = startOfDay(parseISO(dataInicio));
      const filterEndDate = endOfDay(parseISO(dataFim));
      
      return serviceCreatedDate >= filterStartDate && serviceCreatedDate <= filterEndDate;
    } catch (error) {
      console.error('Erro ao filtrar serviço:', error, s);
      return false;
    }
  });

  const servicosRealizados = servicosFiltrados.filter(s => s.status_servico === "Concluído");
  const servicosPendentes = servicosFiltrados.filter(s => ["Aceito", "Coletado"].includes(s.status_servico));
  const servicosRecusados = servicosFiltrados.filter(s => s.status_servico === "Recusado");
  const servicosAguardando = servicosFiltrados.filter(s => s.status_servico === "Aguardando Aceitação");
  const servicosCancelados = servicosFiltrados.filter(s => s.status_servico === "Cancelado");

  const valorTotalServicos = servicosFiltrados.reduce((sum, s) => sum + (s.valor_total || 0), 0);
  const ticketMedio = servicosFiltrados.length > 0 ? valorTotalServicos / servicosFiltrados.length : 0;

  const servicosUrgentes = servicos.filter(s => s.urgente && s.status_servico !== "Concluído");

  const pendentesPix = servicos.filter(s => 
    s.forma_pagamento === "PIX" && 
    s.status_pagamento === "Pendente"
  );

  const servicosAgendados = servicos.filter(s => {
    if (!s.agendado || !s.data_agendamento) return false;
    
    if (["Concluído", "Cancelado", "Recusado"].includes(s.status_servico)) {
      return false;
    }
    
    return true;
  });

  let recusasFiltradas = recusas;
  
  if (filtroRecusaPrestador !== "todos") {
    recusasFiltradas = recusasFiltradas.filter(r => r.prestador_id === filtroRecusaPrestador);
  }
  
  if (filtroRecusaData) {
    const dataFiltro = parseISO(filtroRecusaData);
    recusasFiltradas = recusasFiltradas.filter(r => {
      const dataRecusa = parseISO(r.data_recusa);
      return format(dataRecusa, 'yyyy-MM-dd') === format(dataFiltro, 'yyyy-MM-dd');
    });
  }

  const rankingRecusas = prestadores.map(p => {
    const recusasPrestador = recusas.filter(r => r.prestador_id === p.id);
    return {
      prestador_id: p.id,
      prestador_nome: p.nome,
      total_recusas: recusasPrestador.length,
      valor_total_recusado: recusasPrestador.reduce((sum, r) => sum + (r.valor_servico || 0), 0)
    };
  }).sort((a, b) => b.total_recusas - a.total_recusas).slice(0, 10);

  let canceladosFiltrados = servicos.filter(s => s.status_servico === "Cancelado");

  if (filtroCanceladoCliente !== "todos") {
    canceladosFiltrados = canceladosFiltrados.filter(s => s.cliente_id === filtroCanceladoCliente);
  }

  if (filtroCanceladoPrestador !== "todos") {
    canceladosFiltrados = canceladosFiltrados.filter(s => s.prestador_id === filtroCanceladoPrestador);
  }

  if (filtroCanceladoAutor !== "todos") {
    canceladosFiltrados = canceladosFiltrados.filter(s => s.cancelado_por_email === filtroCanceladoAutor);
  }

  if (filtroCanceladoDataInicio) {
    canceladosFiltrados = canceladosFiltrados.filter(s => {
      if (!s.data_cancelamento) return false;
      const cancelDate = parseISO(s.data_cancelamento);
      const filterStart = startOfDay(parseISO(filtroCanceladoDataInicio));
      return cancelDate >= filterStart;
    });
  }

  if (filtroCanceladoDataFim) {
    canceladosFiltrados = canceladosFiltrados.filter(s => {
      if (!s.data_cancelamento) return false;
      const cancelDate = parseISO(s.data_cancelamento);
      const filterEnd = endOfDay(parseISO(filtroCanceladoDataFim));
      return cancelDate <= filterEnd;
    });
  }

  const autoresCancelamento = [...new Set(servicos
    .filter(s => s.cancelado_por_email)
    .map(s => JSON.stringify({ email: s.cancelado_por_email, nome: s.cancelado_por_nome })))]
    .map(e => JSON.parse(e));

  const abrirDetalhes = (titulo, servicosList) => {
    setTituloDetalhes(titulo);
    setServicosDetalhados(servicosList);
    setDialogDetalhes(true);
  };

  const abrirEdicao = (e, servico) => {
    e.stopPropagation();
    setServicoEdicao(servico);
    setDialogEdicao(true);
  };

  const handleSalvarEdicao = (dadosAtualizados) => {
    editarServicoMutation.mutate({
      id: servicoEdicao.id,
      data: {
        ...servicoEdicao,
        ...dadosAtualizados
      }
    });
  };

  const handleDeleteServico = (e, servicoId) => {
    e.stopPropagation();
    if (window.confirm(`Tem certeza que deseja deletar o serviço #${servicoId} e todos os seus lançamentos associados? Esta ação é irreversível.`)) {
      deletarServicoMutation.mutate(servicoId);
    }
  };

  const hoje = new Date();
  const seismesesAtras = subMonths(hoje, 5);
  const meses = eachMonthOfInterval({ start: seismesesAtras, end: hoje });

  const dadosMensais = meses.map(mes => {
    const inicioMes = startOfMonth(mes);
    const fimMes = endOfMonth(mes);

    const servicosMes = servicos.filter(s => {
      const data = parseISO(s.created_date); 
      return data >= inicioMes && data <= fimMes;
    });

    const valorMes = servicosMes.reduce((sum, s) => sum + (s.valor_total || 0), 0);
    const ticketMedioMes = servicosMes.length > 0 ? valorMes / servicosMes.length : 0;

    return {
      mes: format(mes, 'MMM/yy', { locale: ptBR }),
      quantidade: servicosMes.length,
      ticketMedio: ticketMedioMes
    };
  });

  const tiposServico = [
    { nome: "Urgente", quantidade: servicos.filter(s => s.urgente).length, cor: "#ef4444" },
    { nome: "Agendado", quantidade: servicos.filter(s => s.agendado).length, cor: "#a855f7" },
    { nome: "Normal", quantidade: servicos.filter(s => !s.urgente && !s.agendado).length, cor: "#10b981" }
  ];

  const dadosTiposServico = tiposServico.map(t => ({
    name: t.nome,
    value: t.quantidade,
    cor: t.cor
  }));

  const prestadoresRanking = prestadores.map(p => {
    const servicosPrestador = servicosFiltrados.filter(s => s.prestador_id === p.id);
    return {
      id: p.id,
      nome: p.nome,
      quantidade: servicosPrestador.length
    };
  }).sort((a, b) => b.quantidade - a.quantidade).slice(0, 5);

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor || 0);
  };

  const getClienteNome = (servico) => {
    if (servico.cliente_nome_avulso) return servico.cliente_nome_avulso;
    const cliente = clientes.find(c => c.id === servico.cliente_id);
    return cliente ? cliente.nome : "Cliente não encontrado";
  };

  const getEnderecoResumo = (servico) => {
    if (!servico.enderecos || servico.enderecos.length === 0) return { coleta: "Sem origem", entrega: "Sem destino" };
    
    const coleta = servico.enderecos.find(e => e.tipo === "Coleta");
    const entrega = servico.enderecos.find(e => e.tipo === "Entrega");
    
    const resumoColeta = coleta ? coleta.endereco : "Sem origem";
    const resumoEntrega = entrega ? entrega.endereco : "Sem destino";
    
    return { coleta: resumoColeta, entrega: resumoEntrega };
  };

  const exportarPDF = () => {
    alert("Funcionalidade de exportação PDF em desenvolvimento");
  };

  const exportarExcel = () => {
    alert("Funcionalidade de exportação Excel em desenvolvimento");
  };

  // Se está carregando, mostrar loading
  if (loadingServicos) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-white text-xl">Carregando dados...</p>
          <p className="text-gray-400 text-sm mt-2">Aguarde enquanto sincronizamos os serviços</p>
          {erro && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg max-w-md mx-auto">
              <p className="text-red-400 text-sm">{erro}</p>
              <Button 
                onClick={handleRefreshAll}
                className="mt-3 bg-red-500 hover:bg-red-600"
                size="sm"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Tentar Novamente
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Se houver erro de carregamento (e não estiver carregando)
  if (errorServicos || erro) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center p-4">
        <Card className="max-w-lg w-full bg-red-500/10 border-2 border-red-500/30">
          <CardHeader>
            <CardTitle className="text-red-400 flex items-center gap-2">
              <AlertCircle className="w-6 h-6" />
              Erro de Conexão
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-300">
              {erro || "Não foi possível carregar os dados do servidor."}
            </p>
            <div className="bg-gray-800 p-4 rounded-lg text-sm text-gray-400 space-y-2">
              <p><strong>Possíveis causas:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>CORS bloqueado pelo servidor</li>
                <li>Problema de autenticação (403)</li>
                <li>Erro no servidor Base44 (500)</li>
                <li>Conexão com internet instável</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={handleRefreshAll}
                className="flex-1 bg-green-500 hover:bg-green-600"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Tentar Novamente
              </Button>
              <Button 
                onClick={() => window.location.reload()}
                variant="outline"
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Recarregar Página
              </Button>
            </div>
            <p className="text-xs text-gray-500 text-center">
              Se o erro persistir, entre em contato com o suporte da Base44
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-4xl font-bold text-white flex items-center gap-3">
            <BarChart3 className="w-10 h-10 text-green-500" />
            Painel de Controle
          </h2>
          <p className="text-gray-400 mt-2">Visão geral completa dos serviços</p>
          <p className="text-gray-500 text-sm mt-1">Total de {servicos.length} serviços no sistema</p>
        </div>

        <div className="flex flex-col gap-3 w-full md:w-auto">
          <div className="flex gap-3 w-full md:w-auto">
            <div className="space-y-1 flex-1">
              <Label className="text-xs text-gray-400">Data Início</Label>
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="bg-gray-800 border-green-500/30 text-white focus:border-green-500"
              />
            </div>
            <div className="space-y-1 flex-1">
              <Label className="text-xs text-gray-400">Data Fim</Label>
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="bg-gray-800 border-green-500/30 text-white focus:border-green-500"
              />
            </div>
          </div>
          
          <Button 
            onClick={() => setDialogNovoServico(true)}
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-green-500/50 w-full"
          >
            <Plus className="w-5 h-5 mr-2" />
            Novo Serviço
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card 
          className="border-2 border-red-500/30 bg-red-500/10 hover:border-red-500/50 hover:shadow-lg hover:shadow-red-500/20 transition-all cursor-pointer"
          onClick={() => setDialogRecusas(true)}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                <XCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-red-400">{recusas.length}</p>
                <p className="text-sm text-red-300">Recusas Registradas</p>
                {recusas.length > 0 && (
                  <p className="text-xs text-red-400 mt-1">
                    {rankingRecusas[0]?.prestador_nome} lidera com {rankingRecusas[0]?.total_recusas}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`border-2 border-yellow-500/30 bg-yellow-500/10 hover:border-yellow-500/50 hover:shadow-lg hover:shadow-yellow-500/20 transition-all cursor-pointer ${servicosUrgentes.length > 0 ? 'animate-pulse' : ''}`}
          onClick={() => abrirDetalhes("Serviços Urgentes", servicosUrgentes)}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-yellow-400">{servicosUrgentes.length}</p>
                <p className="text-sm text-yellow-300">Serviços Urgentes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="border-2 border-blue-500/30 bg-blue-500/10 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/20 transition-all cursor-pointer"
          onClick={() => abrirDetalhes("Aguardando Aceitação", servicosAguardando)}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-blue-400">{servicosAguardando.length}</p>
                <p className="text-sm text-blue-300">Aguardando Aceitação</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="border-2 border-purple-500/30 bg-purple-500/10 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/20 transition-all cursor-pointer"
          onClick={() => abrirDetalhes("Serviços Agendados", servicosAgendados)}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                <CalendarIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-purple-400">{servicosAgendados.length}</p>
                <p className="text-sm text-purple-300">Serviços Agendados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="border-2 border-green-500/30 bg-gradient-to-br from-green-500/10 to-emerald-500/10 hover:border-green-500/50 hover:shadow-lg hover:shadow-green-500/20 transition-all cursor-pointer"
          onClick={() => abrirDetalhes("Fretes Realizados", servicosRealizados)}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-green-400">{servicosRealizados.length}</p>
                <p className="text-sm text-green-300">Fretes Realizados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="border-2 border-orange-500/30 bg-orange-500/10 hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/20 transition-all cursor-pointer"
          onClick={() => abrirDetalhes("Fretes Pendentes", servicosPendentes)}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-orange-400">{servicosPendentes.length}</p>
                <p className="text-sm text-orange-300">Fretes Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="border-2 border-amber-500/30 bg-amber-500/10 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/20 transition-all cursor-pointer"
          onClick={() => abrirDetalhes("Pendentes (PIX)", pendentesPix)}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-amber-400">{pendentesPix.length}</p>
                <p className="text-sm text-amber-300">Pendentes (PIX)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="border-2 border-gray-500/30 bg-gray-500/10 hover:border-gray-500/50 hover:shadow-lg hover:shadow-gray-500/20 transition-all cursor-pointer"
          onClick={() => setDialogCancelados(true)}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-500 rounded-full flex items-center justify-center">
                <XCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-400">{servicosCancelados.length}</p>
                <p className="text-sm text-gray-300">Serviços Cancelados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-500/30 bg-gradient-to-br from-green-500/10 to-cyan-500/10 hover:border-green-500/50 hover:shadow-lg hover:shadow-green-500/20 transition-all">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-green-400">
                  {formatarMoeda(valorTotalServicos)}
                </p>
                <p className="text-sm text-green-300">Valor Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 hover:shadow-lg hover:shadow-cyan-500/20 transition-all">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-cyan-500 rounded-full flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-cyan-400">
                  {formatarMoeda(ticketMedio)}
                </p>
                <p className="text-sm text-cyan-300">Ticket Médio</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-2 border-green-500/20 bg-gray-800/50 backdrop-blur shadow-xl">
          <CardHeader className="border-b border-green-500/20 bg-gray-800/30">
            <CardTitle className="text-white">Evolução de Produtividade - Últimos 6 Meses</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dadosMensais}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="mes" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-gray-800 border border-green-500 p-3 rounded-lg">
                          <p className="text-white font-semibold">{payload[0].payload.mes}</p>
                          <p className="text-green-400">Serviços: {payload[0].value}</p>
                          <p className="text-cyan-400">Ticket Médio: {formatarMoeda(payload[0].payload.ticketMedio)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line type="monotone" dataKey="quantidade" stroke="#00ff66" name="Quantidade de Serviços" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-500/20 bg-gray-800/50 backdrop-blur shadow-xl">
          <CardHeader className="border-b border-green-500/20 bg-gray-800/30">
            <CardTitle className="text-white">Distribuição por Tipo de Serviço</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dadosTiposServico}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {dadosTiposServico.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.cor} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {tiposServico.map((tipo, index) => (
                <div key={tipo.nome} className="flex justify-between items-center p-3 bg-gray-700/30 rounded-lg border border-green-500/20">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: tipo.cor }} />
                    <span className="font-medium text-gray-300">{tipo.nome}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-white">{tipo.quantidade} serviços</p>
                    <p className="text-xs text-gray-500">
                      {servicos.length > 0 ? ((tipo.quantidade / servicos.length) * 100).toFixed(1) : 0}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-2 border-green-500/20 bg-gray-800/50 backdrop-blur shadow-xl">
        <CardHeader className="border-b border-green-500/20 bg-gray-800/30">
          <CardTitle className="flex items-center gap-2 text-white">
            <Trophy className="w-5 h-5 text-green-500" />
            Top 5 Prestadores - Serviços Realizados no Período
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {prestadoresRanking.length > 0 ? prestadoresRanking.map((p, index) => (
              <div key={p.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-700/50 to-gray-800/30 rounded-xl hover:shadow-lg hover:shadow-green-500/10 transition-all border border-green-500/20">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-white text-lg shadow-lg ${
                    index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                    index === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-400' :
                    index === 2 ? 'bg-gradient-to-r from-orange-300 to-orange-400' :
                    'bg-gradient-to-r from-green-500 to-emerald-600'
                  }`}>
                    {index + 1}º
                  </div>
                  <div>
                    <p className="font-bold text-xl text-white">{p.nome}</p>
                    <p className="text-sm text-gray-400">{p.quantidade} serviços realizados</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-3xl text-green-400">{p.quantidade}</p>
                </div>
              </div>
            )) : (
              <p className="text-center text-gray-500 py-8">Nenhum serviço no período selecionado</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogRecusas} onOpenChange={setDialogRecusas}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-gray-800 border-2 border-red-500/30">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-3">
              <XCircle className="w-6 h-6 text-red-500" />
              Histórico de Recusas de Serviços
              <Badge className="bg-red-500/20 text-red-300">{recusasFiltradas.length} registros</Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Filtrar por Prestador</Label>
              <Select value={filtroRecusaPrestador} onValueChange={setFiltroRecusaPrestador}>
                <SelectTrigger className="bg-gray-700 border-red-500/30 text-white">
                  <SelectValue placeholder="Selecione um prestador" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-red-500/30 text-white">
                  <SelectItem value="todos">Todos os Prestadores</SelectItem>
                  {prestadores.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Filtrar por Data</Label>
              <Input
                type="date"
                value={filtroRecusaData}
                onChange={(e) => setFiltroRecusaData(e.target.value)}
                className="bg-gray-700 border-red-500/30 text-white"
              />
            </div>
          </div>

          {rankingRecusas.length > 0 && (
            <Card className="bg-gray-700/30 border-red-500/20 mb-4">
              <CardHeader>
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-red-500" />
                  Top 10 Prestadores com Mais Recusas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {rankingRecusas.map((item, index) => (
                    <div key={item.prestador_id} className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                          index === 0 ? 'bg-red-600 text-white' : index === 1 ? 'bg-red-500 text-white' : index === 2 ? 'bg-red-400 text-white' : 'bg-gray-600 text-gray-300'
                        }`}>
                          {index + 1}º
                        </div>
                        <span className="text-white text-sm">{item.prestador_nome}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-red-400 font-bold">{item.total_recusas} recusas</p>
                        <p className="text-xs text-gray-500">{formatarMoeda(item.valor_total_recusado)} em serviços</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            {recusasFiltradas.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Nenhuma recusa registrada</p>
            ) : (
              recusasFiltradas.map((recusa) => (
                <Card key={recusa.id} className="bg-gray-700/30 border-red-500/20">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge className="bg-red-500 text-white font-bold">
                            OS #{recusa.numero_pedido}
                          </Badge>
                          <Badge variant="outline" className="border-gray-600 text-gray-300">
                            {recusa.cliente_nome}
                          </Badge>
                          {recusa.valor_servico && (
                            <Badge variant="outline" className="border-green-500/30 text-green-400">
                              {formatarMoeda(recusa.valor_servico)}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                          <div>
                            <p className="text-xs text-gray-500">Prestador que Recusou</p>
                            <p className="text-sm font-semibold text-white">{recusa.prestador_nome}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Data da Recusa</p>
                            <p className="text-sm font-semibold text-white">
                              {formatarDataSegura(recusa.data_recusa, 'dd/MM/yyyy HH:mm')}
                            </p>
                          </div>
                        </div>

                        {recusa.motivo_recusa && (
                          <div className="mt-3 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                            <p className="text-xs text-gray-500 mb-1">Motivo da Recusa:</p>
                            <p className="text-sm text-red-300">{recusa.motivo_recusa}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ServicoDialog
        aberto={dialogNovoServico}
        setAberto={setDialogNovoServico}
      />

      <EditarServicoDialog
        aberto={dialogEdicao}
        setAberto={setDialogEdicao}
        servico={servicoEdicao}
        onSalvar={handleSalvarEdicao}
      />

      <Dialog open={dialogCancelarServico} onOpenChange={setDialogCancelarServico}>
        <DialogContent className="max-w-lg bg-gray-800 border-2 border-red-500/30">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Cancelar Serviço #{servicoParaCancelar?.numero_pedido}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-300">
                ⚠️ Ao cancelar, o valor do serviço será <strong>zerado automaticamente</strong> e removido do caixa do prestador.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Motivo do Cancelamento (opcional)</Label>
              <Textarea
                value={motivoCancelamento}
                onChange={(e) => setMotivoCancelamento(e.target.value)}
                placeholder="Descreva o motivo..."
                className="bg-gray-700 border-gray-600 text-white h-24"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setDialogCancelarServico(false);
                  setServicoParaCancelar(null);
                  setMotivoCancelamento("");
                }}
                className="border-gray-600 text-gray-300"
              >
                Cancelar Ação
              </Button>
              <Button
                onClick={() => cancelarServicoMutation.mutate({ 
                  servico: servicoParaCancelar, 
                  motivo: motivoCancelamento 
                })}
                className="bg-red-500 hover:bg-red-600 text-white"
                disabled={cancelarServicoMutation.isPending}
              >
                {cancelarServicoMutation.isPending ? "Cancelando..." : "Confirmar Cancelamento"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogCancelados} onOpenChange={setDialogCancelados}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-gray-800 border-2 border-gray-500/30">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-3">
              <XCircle className="w-6 h-6 text-gray-500" />
              Serviços Cancelados
              <Badge className="bg-gray-500/20 text-gray-300">{canceladosFiltrados.length} registros</Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Período de Cancelamento</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={filtroCanceladoDataInicio}
                  onChange={(e) => setFiltroCanceladoDataInicio(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                />
                <Input
                  type="date"
                  value={filtroCanceladoDataFim}
                  onChange={(e) => setFiltroCanceladoDataFim(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Cliente</Label>
              <Select value={filtroCanceladoCliente} onValueChange={setFiltroCanceladoCliente}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="todos">Todos os Clientes</SelectItem>
                  {clientes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Prestador</Label>
              <Select value={filtroCanceladoPrestador} onValueChange={setFiltroCanceladoPrestador}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="todos">Todos os Prestadores</SelectItem>
                  {prestadores.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Cancelado Por</Label>
              <Select value={filtroCanceladoAutor} onValueChange={setFiltroCanceladoAutor}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="todos">Todos</SelectItem>
                  {autoresCancelamento.map(autor => (
                    <SelectItem key={autor.email} value={autor.email}>{autor.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            {canceladosFiltrados.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Nenhum serviço cancelado</p>
            ) : (
              canceladosFiltrados.map((servico) => (
                <Card key={servico.id} className="bg-gray-700/30 border-gray-500/20">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div 
                        className="flex-1 cursor-pointer hover:bg-gray-600/20 p-2 rounded transition"
                        onClick={() => setServicoCanceladoDetalhe(
                          servicoCanceladoDetalhe?.id === servico.id ? null : servico
                        )}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <Badge className="bg-gray-600 text-white font-bold">
                            OS #{servico.numero_pedido}
                          </Badge>
                          <Badge variant="outline" className="border-gray-600 text-gray-300">
                            {getClienteNome(servico)}
                          </Badge>
                          <Badge variant="outline" className="border-red-500/30 text-red-400">
                            R$ 0,00 (Cancelado)
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                          <div>
                            <p className="text-xs text-gray-500">Prestador</p>
                            <p className="text-white">{servico.prestador_nome}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Cancelado em</p>
                            <p className="text-white">{formatarDataSegura(servico.data_cancelamento, 'dd/MM/yyyy HH:mm')}</p>
                          </div>
                          {servico.cancelado_por_nome && (
                            <div>
                              <p className="text-xs text-gray-500">Cancelado por</p>
                              <p className="text-white">{servico.cancelado_por_nome}</p>
                            </div>
                          )}
                        </div>

                        {servico.motivo_cancelamento && (
                          <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded">
                            <p className="text-xs text-gray-500">Motivo:</p>
                            <p className="text-sm text-red-300">{servico.motivo_cancelamento}</p>
                          </div>
                        )}

                        {servicoCanceladoDetalhe?.id === servico.id && (
                          <div className="mt-4 pt-4 border-t border-gray-600 space-y-2">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <p className="text-xs text-gray-500">Forma de Pagamento</p>
                                <p className="text-white">{servico.forma_pagamento}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Criado em</p>
                                <p className="text-white">{formatarDataSegura(servico.created_date, 'dd/MM/yyyy HH:mm')}</p>
                              </div>
                            </div>

                            {servico.enderecos && servico.enderecos.length > 0 && (
                              <div>
                                <p className="text-xs text-gray-500 mb-2">Itinerário</p>
                                {servico.enderecos.map((end, idx) => (
                                  <div key={idx} className="text-sm text-white mb-1">
                                    <Badge className="mr-2 text-xs">{end.tipo}</Badge>
                                    {end.endereco}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 ml-4">
                        <Button
                          onClick={() => reativarServicoMutation.mutate(servico)}
                          size="sm"
                          className="bg-green-500 hover:bg-green-600 text-white"
                          disabled={reativarServicoMutation.isPending}
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Reativar
                        </Button>

                        <Button
                          onClick={() => {
                            setDialogCancelados(false);
                            abrirEdicao(new Event('click'), servico);
                          }}
                          variant="outline"
                          size="sm"
                          className="border-gray-600 text-gray-300 hover:bg-gray-700"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Editar
                        </Button>

                        <Button
                          onClick={() => handleDeleteServico(new Event('click'), servico.id)}
                          variant="outline"
                          size="sm"
                          className="border-red-600 text-red-300 hover:bg-red-700"
                          disabled={deletarServicoMutation.isPending}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>


      <Dialog open={dialogDetalhes} onOpenChange={setDialogDetalhes}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-gray-800 border-2 border-green-500/30">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center justify-between">
              <span>{tituloDetalhes}</span>
              <div className="flex gap-2">
                <Button onClick={exportarPDF} size="sm" variant="outline" className="border-green-500/30 text-green-400 hover:bg-green-500/10">
                  <Download className="w-4 h-4 mr-1" />
                  PDF
                </Button>
                <Button onClick={exportarExcel} size="sm" variant="outline" className="border-green-500/30 text-green-400 hover:bg-green-500/10">
                  <Download className="w-4 h-4 mr-1" />
                  Excel
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3">
            {servicosDetalhados.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Nenhum serviço encontrado</p>
            ) : (
              servicosDetalhados.map((servico) => {
                const enderecos = getEnderecoResumo(servico);
                const isPendentePix = tituloDetalhes === "Pendentes (PIX)";
                
                return (
                  <Card key={servico.id} className="border-2 border-green-500/20 bg-gray-700/30">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                          <div className="text-center">
                            <div className="text-[10px] text-green-100 font-semibold">OS</div>
                            <div className="text-xl font-bold text-white">#{servico.numero_pedido}</div>
                          </div>
                        </div>

                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs text-gray-500">Cliente</p>
                            <p className="font-bold text-white truncate">{getClienteNome(servico)}</p>
                            <p className="text-xs text-gray-400 mt-1">Prestador: {servico.prestador_nome}</p>
                          </div>

                          <div>
                            <div className="flex items-start gap-1 mb-2">
                              <MapPin className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-[10px] text-gray-500">Coleta</p>
                                <p className="text-xs text-white line-clamp-1">{enderecos.coleta}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-1">
                              <MapPin className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-[10px] text-gray-500">Entrega</p>
                                <p className="text-xs text-white line-clamp-1">{enderecos.entrega}</p>
                              </div>
                            </div>
                          </div>

                          <div>
                            <p className="text-xs text-gray-500">Valor / Pagamento</p>
                            <p className="text-lg font-bold text-green-400">{formatarMoeda(servico.valor_total)}</p>
                            <div className="flex gap-1 mt-1">
                              <Badge variant="outline" className="text-[10px]">{servico.forma_pagamento}</Badge>
                              <Badge className={servico.status_pagamento === "Pago" ? "bg-green-500" : "bg-yellow-500"}>
                                {servico.status_pagamento}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          {isPendentePix && servico.status_pagamento === "Pendente" && (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`Marcar serviço #${servico.numero_pedido} como Pago?`)) {
                                  marcarPagoMutation.mutate(servico);
                                }
                              }}
                              size="sm"
                              className="bg-green-500 hover:bg-green-600 text-white"
                              disabled={marcarPagoMutation.isPending}
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              {marcarPagoMutation.isPending ? "Processando..." : "Pagar"}
                            </Button>
                          )}

                          {servico.status_servico !== "Cancelado" && (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                setServicoParaCancelar(servico);
                                setMotivoCancelamento("");
                                setDialogCancelarServico(true);
                              }}
                              size="sm"
                              variant="outline"
                              className="border-red-500 text-red-400 hover:bg-red-500/10"
                            >
                              <XCircle className="w-3 h-3 mr-1" />
                              Cancelar
                            </Button>
                          )}

                          <Button
                            onClick={(e) => abrirEdicao(e, servico)}
                            variant="outline"
                            size="sm"
                            className="border-gray-600 text-gray-300 hover:bg-gray-700"
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Editar
                          </Button>

                          <Button
                            onClick={(e) => handleDeleteServico(e, servico.id)}
                            variant="outline"
                            size="sm"
                            className="border-red-600 text-red-300 hover:bg-red-700"
                            disabled={deletarServicoMutation.isPending}
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            {deletarServicoMutation.isPending ? "Deletando..." : "Deletar"}
                          </Button>
                        </div>
                      </div>

                      {servico.observacao_geral && (
                        <div className="mt-3 p-2 bg-gray-600/30 rounded text-xs text-gray-300">
                          <strong>Obs:</strong> {servico.observacao_geral}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
