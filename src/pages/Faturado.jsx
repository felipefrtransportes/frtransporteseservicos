
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
import {
  DollarSign,
  Users,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  TrendingUp,
  Download,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Eye,
  FileSpreadsheet,
  Loader2,
  Search // Added Search icon
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, startOfMonth, endOfMonth, parseISO, startOfDay, endOfDay, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LineChart, Line, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend, ResponsiveContainer } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

export default function Faturado() {
  const [dataInicio, setDataInicio] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dataFim, setDataFim] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [filtrosVisiveis, setFiltrosVisiveis] = useState(false);
  const [clienteFiltro, setClienteFiltro] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");
  const [formaPagamentoFiltro, setFormaPagamentoFiltro] = useState("");
  const [dialogDetalhes, setDialogDetalhes] = useState(false);
  const [dialogFechamento, setDialogFechamento] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [servicosSelecionados, setServicosSelecionados] = useState([]);
  const [dadosFechamentoManual, setDadosFechamentoManual] = useState({
    periodo_inicio: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    periodo_fim: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    data_vencimento: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    observacoes: "",
    ativar_faturamento: false // New state for activating invoicing
  });
  const [gerandoPDF, setGerandoPDF] = useState(false);
  const [user, setUser] = useState(null); // New state for user info
  const [buscaCliente, setBuscaCliente] = useState(""); // New: Search state for clients

  const queryClient = useQueryClient();

  // Helper para formatar datas com segurança
  const formatarDataSegura = (data, formatString = 'dd/MM/yyyy') => {
    if (!data) return '-';
    try {
      const dataObj = typeof data === 'string' ? parseISO(data) : new Date(data);
      if (isNaN(dataObj.getTime())) {
        console.warn('Data inválida detectada:', data); // Log invalid data for debugging
        return '-';
      }
      return format(dataObj, formatString, { locale: ptBR });
    } catch (error) {
      console.error('Erro ao formatar data:', error, data);
      return '-';
    }
  };

  // Fetch current user details on component mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Erro ao carregar usuário:", error);
      }
    };
    loadUser();
  }, []);

  const { data: fechamentos = [] } = useQuery({
    queryKey: ['fechamentos'],
    queryFn: () => base44.entities.Fechamento.list('-data_fechamento'),
    refetchInterval: 5000
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list('nome'),
    refetchInterval: 10000
  });

  const { data: servicos = [] } = useQuery({
    queryKey: ['servicos'],
    queryFn: () => base44.entities.Servico.list('-created_date'),
    refetchInterval: 5000
  });

  // ✅ Gerar número sequencial de fechamento (sem reutilizar excluídos)
  const gerarNumeroFechamento = () => {
    if (fechamentos.length === 0) {
      return "FAT-0001";
    }

    // Extrair todos os números FAT já utilizados
    const numerosUsados = fechamentos
      .map(f => f.numero_fechamento)
      .filter(Boolean)
      .map(n => {
        const match = n.match(/FAT-(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(n => n > 0);

    // Encontrar o maior número já utilizado
    const maiorNumero = numerosUsados.length > 0
      ? Math.max(...numerosUsados)
      : 0;

    // Próximo número é sempre maior número + 1
    const proximoNumero = maiorNumero + 1;

    // Formatar com 4 dígitos
    const numeroFormatado = proximoNumero.toString().padStart(4, '0');

    console.log(`📦 Próximo número de fechamento: FAT-${numeroFormatado} (maior anterior: ${maiorNumero})`);

    return `FAT-${numeroFormatado}`;
  };

  // Função corrigida para verificar OS duplicada
  const verificarOSDuplicada = (numeroOS) => {
    if (!numeroOS) return false;

    // Iterar por todos os fechamentos
    for (const fechamento of fechamentos) {
      if (fechamento.servicos_ids && fechamento.servicos_ids.length > 0) {
        // Encontrar os serviços reais de cada ID no fechamento
        const fechamentoServicos = servicos.filter(s => fechamento.servicos_ids.includes(s.id));

        // Verificar se o numero_pedido existe em algum serviço deste fechamento
        if (fechamentoServicos.some(s => s.numero_pedido === numeroOS)) {
          return true; // OS duplicada encontrada
        }
      }
    }
    return false; // Nenhuma duplicata encontrada
  };

  const createFechamentoMutation = useMutation({
    mutationFn: async (dados) => {
      const cliente = clientes.find(c => c.id === dados.cliente_id);

      // Verificar duplicatas antes de criar fechamento
      const servicosParaFechar = servicos.filter(s => dados.servicos_ids.includes(s.id));
      const osDuplicadas = servicosParaFechar.filter(s => verificarOSDuplicada(s.numero_pedido));

      if (osDuplicadas.length > 0) {
        const osNums = osDuplicadas.map(s => `#${s.numero_pedido}`).join(', ');
        throw new Error(`As seguintes OS já foram incluídas em fechamentos anteriores e não podem ser faturadas novamente: ${osNums}`);
      }

      // Gerar número único do fechamento
      const numeroFechamento = gerarNumeroFechamento();

      // Criar fechamento
      const fechamento = await base44.entities.Fechamento.create({
        numero_fechamento: numeroFechamento,
        cliente_id: dados.cliente_id,
        cliente_nome: cliente.nome,
        periodo_inicio: dados.periodo_inicio,
        periodo_fim: dados.periodo_fim,
        valor_total: dados.valor_total,
        quantidade_servicos: dados.servicos_ids.length,
        data_fechamento: format(new Date(), 'yyyy-MM-dd'),
        data_vencimento: dados.data_vencimento,
        status: "Aberto",
        tipo_fechamento: "Manual",
        servicos_ids: dados.servicos_ids,
        observacoes: dados.observacoes,
        criado_por_nome: user?.full_name || "Administrador",
        criado_por_email: user?.email || "admin@fr.com"
      });

      // Criar lançamento no financeiro com número do fechamento
      const lancamento = await base44.entities.Lancamento.create({
        tipo: "Receita",
        descricao: `${numeroFechamento} - ${cliente.nome} (${formatarDataSegura(dados.periodo_inicio)} a ${formatarDataSegura(dados.periodo_fim)})`,
        valor: dados.valor_total,
        categoria: "Faturamento",
        data_lancamento: format(new Date(), 'yyyy-MM-dd'),
        data_vencimento: dados.data_vencimento,
        status_pagamento: "Pendente",
        incluir_financeiro_geral: true,
        cliente_id: dados.cliente_id,
        criado_por_nome: user?.full_name || "Administrador",
        criado_por_email: user?.email || "admin@fr.com",
        observacoes: `Fechamento ${numeroFechamento} com ${dados.servicos_ids.length} serviços`
      });

      // SOMENTE AGORA atualizar os serviços para "fechado"
      for (const servicoId of dados.servicos_ids) {
        await base44.entities.Servico.update(servicoId, {
          faturado_status: "fechado",
          fechamento_id: fechamento.id,
          numero_fechamento: numeroFechamento
        });
      }

      // Atualizar último fechamento do cliente
      const atualizacaoCliente = {
        ultimo_fechamento: format(new Date(), 'yyyy-MM-dd')
      };

      if (dados.ativar_faturamento && cliente.tipo_pagamento !== "FATURAMENTO_AUTOMATICO") {
        atualizacaoCliente.tipo_pagamento = "FATURAMENTO_MANUAL";
        atualizacaoCliente.faturamento_ativo = true; // Set faturamento_ativo to true
      }

      await base44.entities.Cliente.update(dados.cliente_id, atualizacaoCliente);

      // Atualizar fechamento com ID do lançamento
      await base44.entities.Fechamento.update(fechamento.id, {
        lancamento_financeiro_id: lancamento.id
      });

      return fechamento;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['fechamentos']);
      queryClient.invalidateQueries(['servicos']);
      queryClient.invalidateQueries(['lancamentos']);
      queryClient.invalidateQueries(['clientes']);
      setDialogFechamento(false);
      setDialogDetalhes(false);
      setClienteSelecionado(null);
      setServicosSelecionados([]);
      setDadosFechamentoManual({
        periodo_inicio: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        periodo_fim: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
        data_vencimento: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
        observacoes: "",
        ativar_faturamento: false
      });
      alert("✅ Fechamento realizado com sucesso!");
    },
    onError: (error) => {
      alert("❌ " + error.message);
    }
  });

  // Marcar fechamento como pago (baixa todas as OS vinculadas)
  const marcarFechamentoPagoMutation = useMutation({
    mutationFn: async (fechamento) => {
      const dataPagamento = format(new Date(), 'yyyy-MM-dd');

      // Atualizar todas as OS vinculadas para "Pago"
      for (const servicoId of fechamento.servicos_ids || []) {
        await base44.entities.Servico.update(servicoId, {
          status_pagamento: "Pago",
          data_pagamento: new Date().toISOString()
        });
      }

      // Atualizar fechamento
      await base44.entities.Fechamento.update(fechamento.id, {
        status: "Pago",
        data_pagamento: dataPagamento
      });

      // Atualizar lançamento financeiro
      if (fechamento.lancamento_financeiro_id) {
        await base44.entities.Lancamento.update(fechamento.lancamento_financeiro_id, {
          status_pagamento: "Recebido",
          data_pagamento: dataPagamento
        });
      }

      return fechamento;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['fechamentos']);
      queryClient.invalidateQueries(['servicos']);
      queryClient.invalidateQueries(['lancamentos']);
      alert("✅ Fechamento marcado como pago! Todas as OS vinculadas foram atualizadas.");
    },
    onError: (error) => {
      alert("❌ Erro ao marcar como pago: " + error.message);
    }
  });


  // Filtrar fechamentos por período
  const fechamentosFiltrados = fechamentos.filter(f => {
    const dataFech = new Date(f.data_fechamento);
    const inicio = startOfDay(parseISO(dataInicio));
    const fim = endOfDay(parseISO(dataFim));

    // Check for Invalid Date
    if (isNaN(dataFech.getTime()) || isNaN(inicio.getTime()) || isNaN(fim.getTime())) {
      console.warn('Data inválida no filtro de fechamentos', f.data_fechamento, dataInicio, dataFim);
      return false;
    }

    const dentroData = dataFech >= inicio && dataFech <= fim;
    const matchCliente = !clienteFiltro || f.cliente_id === clienteFiltro;
    const matchStatus = !statusFiltro || f.status === statusFiltro;

    return dentroData && matchCliente && matchStatus;
  });

  // Serviços faturados no período
  const servicosFaturados = servicos.filter(s => {
    if (!s.is_faturado) return false;

    const dataServ = new Date(s.created_date);
    const inicio = startOfDay(parseISO(dataInicio));
    const fim = endOfDay(parseISO(dataFim));

    // Check for Invalid Date
    if (isNaN(dataServ.getTime()) || isNaN(inicio.getTime()) || isNaN(fim.getTime())) {
      console.warn('Data inválida no filtro de serviços faturados', s.created_date, dataInicio, dataFim);
      return false;
    }

    const dentroData = dataServ >= inicio && dataServ <= fim;
    const matchCliente = !clienteFiltro || s.cliente_id === clienteFiltro;
    const matchPagamento = !formaPagamentoFiltro || s.forma_pagamento === formaPagamentoFiltro;
    const matchStatus = !statusFiltro ||
      (statusFiltro === "pendente" && s.faturado_status === "pendente") ||
      (statusFiltro === "fechado" && s.faturado_status === "fechado") ||
      (statusFiltro === "pago" && s.status_pagamento === "Pago");

    return dentroData && matchCliente && matchPagamento && matchStatus;
  });

  // MÉTRICAS
  const clientesFaturados = [...new Set(servicosFaturados.map(s => s.cliente_id))].filter(Boolean).length;

  const servicosPendentes = servicos.filter(s =>
    s.is_faturado && s.faturado_status === "pendente" && !verificarOSDuplicada(s.numero_pedido)
  ).length;

  const valorTotalFaturado = servicosFaturados.reduce((sum, s) => sum + (s.valor_total || 0), 0);

  const valorAReceber = servicosFaturados
    .filter(s => s.status_pagamento !== "Pago")
    .reduce((sum, s) => sum + (s.valor_total || 0), 0);

  const valorRecebido = servicosFaturados
    .filter(s => s.status_pagamento === "Pago")
    .reduce((sum, s) => sum + (s.valor_total || 0), 0);

  const ticketMedio = clientesFaturados > 0 ? valorTotalFaturado / clientesFaturados : 0;

  // Dados para gráfico de pizza (distribuição de pagamentos)
  const distribuicaoPagamentos = [
    {
      name: "Faturado (Notinha)",
      value: servicosFaturados.filter(s => s.forma_pagamento === "Faturado (Notinha)").length,
      color: "#3b82f6"
    },
    {
      name: "Faturado (Planilha)",
      value: servicosFaturados.filter(s => s.forma_pagamento === "Faturado (Planilha)").length,
      color: "#8b5cf6"
    }
  ].filter(d => d.value > 0);

  // Dados para gráfico de evolução
  const getDadosEvolucao = () => {
    const inicio = parseISO(dataInicio);
    const fim = parseISO(dataFim);
    const dias = [];

    // Check for Invalid Date
    if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) {
      console.warn('Data inválida no gráfico de evolução', dataInicio, dataFim);
      return [];
    }

    let atual = inicio;
    while (atual <= fim) {
      dias.push(atual);
      atual = addDays(atual, 7); // Agrupar por semana
    }

    return dias.map(dia => {
      const fimSemana = addDays(dia, 6);
      const servicosSemana = servicosFaturados.filter(s => {
        const dataServ = new Date(s.created_date);
        return !isNaN(dataServ.getTime()) && dataServ >= dia && dataServ <= fimSemana;
      });

      return {
        periodo: format(dia, 'dd/MM'),
        valor: servicosSemana.reduce((sum, s) => sum + (s.valor_total || 0), 0)
      };
    });
  };

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor || 0);
  };

  const limparFiltros = () => {
    setClienteFiltro("");
    setStatusFiltro("");
    setFormaPagamentoFiltro("");
  };

  const abrirDetalhesCliente = (cliente) => {
    setClienteSelecionado(cliente);
    setDialogDetalhes(true);
  };

  const abrirFechamentoManual = () => {
    if (!clienteSelecionado) return;

    // CORREÇÃO: Buscar TODOS os serviços faturados com status pendente do cliente
    const servicosPendentes = servicos.filter(s => {
      // Verificar se pertence ao cliente
      if (s.cliente_id !== clienteSelecionado.id) return false;

      // Verificar se é faturado
      if (!s.is_faturado) return false;

      // CRUCIAL: Verificar se está com status "pendente" (não foi fechado ainda)
      if (s.faturado_status !== "pendente") return false;

      return true;
    });

    // Filtrar apenas serviços que NÃO foram fechados ainda (verificação extra)
    const servicosDisponiveis = servicosPendentes.filter(s => {
      const jaDuplicado = verificarOSDuplicada(s.numero_pedido);
      return !jaDuplicado;
    });

    // Calcular datas automaticamente baseado nos serviços disponíveis
    let periodoInicio = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    let periodoFim = format(endOfMonth(new Date()), 'yyyy-MM-dd');

    if (servicosDisponiveis.length > 0) {
      try {
        const datasServicos = servicosDisponiveis
          .map(s => s.created_date ? new Date(s.created_date) : null)
          .filter(d => d && !isNaN(d.getTime()));

        if (datasServicos.length > 0) {
          periodoInicio = format(new Date(Math.min(...datasServicos)), 'yyyy-MM-dd');
          periodoFim = format(new Date(Math.max(...datasServicos)), 'yyyy-MM-dd');
        }
      } catch (error) {
        console.error('Erro ao calcular período:', error);
      }
    }

    // Calcular data de vencimento conforme regra do cliente
    let dataVencimento;
    try {
      if (clienteSelecionado.regra_vencimento === "dia_fixo" && clienteSelecionado.dia_vencimento_fixo) {
        const hoje = new Date();
        dataVencimento = new Date(hoje.getFullYear(), hoje.getMonth(), clienteSelecionado.dia_vencimento_fixo);
        if (dataVencimento < hoje) {
          dataVencimento.setMonth(dataVencimento.getMonth() + 1);
        }
      } else {
        dataVencimento = addDays(new Date(), 7);
      }
    } catch (error) {
      console.error('Erro ao calcular vencimento:', error);
      dataVencimento = addDays(new Date(), 7); // Fallback to 7 days from now
    }

    setDadosFechamentoManual({
      periodo_inicio: periodoInicio,
      periodo_fim: periodoFim,
      data_vencimento: format(dataVencimento, 'yyyy-MM-dd'),
      observacoes: "", // Reset observations
      ativar_faturamento: clienteSelecionado.tipo_pagamento !== "FATURAMENTO_AUTOMATICO" &&
                          clienteSelecionado.tipo_pagamento !== "FATURAMENTO_MANUAL" // Default to activate if not already active
    });

    // IMPORTANTE: Pré-selecionar todos os serviços disponíveis
    setServicosSelecionados(servicosDisponiveis.map(s => s.id));
    setDialogFechamento(true);
  };

  const handleToggleServico = (servicoId) => {
    if (servicosSelecionados.includes(servicoId)) {
      setServicosSelecionados(servicosSelecionados.filter(id => id !== servicoId));
    } else {
      setServicosSelecionados([...servicosSelecionados, servicoId]);
    }
  };

  const handleConfirmarFechamento = () => {
    if (servicosSelecionados.length === 0) {
      alert("Selecione pelo menos um serviço para fechamento.");
      return;
    }

    const servicosParaFechar = servicos.filter(s => servicosSelecionados.includes(s.id));
    const valorTotal = servicosParaFechar.reduce((sum, s) => sum + (s.valor_total || 0), 0);

    createFechamentoMutation.mutate({
      cliente_id: clienteSelecionado.id,
      periodo_inicio: dadosFechamentoManual.periodo_inicio,
      periodo_fim: dadosFechamentoManual.periodo_fim,
      valor_total: valorTotal,
      data_vencimento: dadosFechamentoManual.data_vencimento,
      servicos_ids: servicosSelecionados,
      observacoes: dadosFechamentoManual.observacoes,
      ativar_faturamento: dadosFechamentoManual.ativar_faturamento
    });
  };

  const gerarRelatorioPDF = async (cliente) => {
    setGerandoPDF(true);
    try {
      // Aqui você implementaria a geração do PDF
      // Por enquanto, vou simular o download
      alert(`Gerando relatório PDF para ${cliente.nome}...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert("Relatório gerado com sucesso!");
    } catch (error) {
      alert("Erro ao gerar relatório: " + error.message);
    } finally {
      setGerandoPDF(false);
    }
  };

  // Clientes com faturamento ativo (manual ou automático)
  const clientesComFaturamento = clientes
    .filter(c => c.faturamento_ativo) // Filter by the 'faturamento_ativo' field
    .filter(c =>
      c.nome?.toLowerCase().includes(buscaCliente.toLowerCase()) ||
      c.telefone?.includes(buscaCliente) ||
      c.email?.toLowerCase().includes(buscaCliente.toLowerCase())
    )
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  const getTipoPagamentoBadge = (tipo) => {
    switch (tipo) {
      case "FATURAMENTO_AUTOMATICO":
        return { text: "Automático Ativo", color: "bg-green-500/20 text-green-400 border-green-500/30" };
      case "FATURAMENTO_MANUAL":
        return { text: "Manual Ativo", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" };
      default:
        return { text: "Não Ativo", color: "bg-gray-500/20 text-gray-400 border-gray-500/30" };
    }
  };

  // Status de serviço colors
  const statusColors = {
    "Aberto": "bg-blue-500/20 text-blue-400",
    "Em Andamento": "bg-yellow-500/20 text-yellow-400",
    "Concluído": "bg-green-500/20 text-green-400",
    "Cancelado": "bg-red-500/20 text-red-400",
    "Aguardando Peça": "bg-orange-500/20 text-orange-400",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-4xl font-bold text-white flex items-center gap-3">
            <FileText className="w-10 h-10 text-green-500" />
            Faturamento
          </h2>
          <p className="text-gray-400 mt-2">Gestão completa do caixa individual de cada prestador</p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-gray-400">Data Início</Label>
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="bg-gray-800 border-green-500/30 text-white"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-400">Data Fim</Label>
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="bg-gray-800 border-green-500/30 text-white"
              />
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => setFiltrosVisiveis(!filtrosVisiveis)}
            className={`border-green-500/30 ${filtrosVisiveis ? 'bg-green-500/10 text-green-400' : 'text-green-400'} hover:bg-green-500/20`}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtros
            {filtrosVisiveis ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
          </Button>
        </div>
      </div>

      {/* Filtros Expansíveis */}
      {filtrosVisiveis && (
        <Card className="border-2 border-green-500/20 bg-gray-800/50 backdrop-blur shadow-xl animate-in slide-in-from-top duration-300">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-gray-400">Cliente</Label>
                <Select value={clienteFiltro} onValueChange={setClienteFiltro}>
                  <SelectTrigger className="bg-gray-700 border-green-500/30 text-white">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-green-500/30">
                    <SelectItem value={null}>Todos</SelectItem>
                    {clientesComFaturamento.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-gray-400">Status</Label>
                <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                  <SelectTrigger className="bg-gray-700 border-green-500/30 text-white">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-green-500/30">
                    <SelectItem value={null}>Todos</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="fechado">Fechado</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-gray-400">Forma de Pagamento</Label>
                <Select value={formaPagamentoFiltro} onValueChange={setFormaPagamentoFiltro}>
                  <SelectTrigger className="bg-gray-700 border-green-500/30 text-white">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-green-500/30">
                    <SelectItem value={null}>Todas</SelectItem>
                    <SelectItem value="Faturado (Notinha)">Faturado (Notinha)</SelectItem>
                    <SelectItem value="Faturado (Planilha)">Faturado (Planilha)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={limparFiltros}
                  className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  <X className="w-4 h-4 mr-2" />
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Balões de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Clientes Faturados */}
        <Card
          className="border-2 border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 hover:shadow-lg hover:shadow-blue-500/20 transition-all group cursor-pointer"
          title="Total de clientes com serviços faturados no período"
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-4xl font-bold text-blue-400">{clientesFaturados}</p>
                <p className="text-sm text-blue-300">Clientes Faturados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Serviços Pendentes */}
        <Card
          className="border-2 border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-amber-500/10 hover:shadow-lg hover:shadow-yellow-500/20 transition-all group cursor-pointer"
          title="Serviços faturados aguardando fechamento"
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-yellow-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <Clock className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-4xl font-bold text-yellow-400">{servicosPendentes}</p>
                <p className="text-sm text-yellow-300">Serviços Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Valor Total Faturado */}
        <Card
          className="border-2 border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-pink-500/10 hover:shadow-lg hover:shadow-purple-500/20 transition-all group cursor-pointer"
          title="Soma total de todos os serviços faturados no período"
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-purple-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <DollarSign className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-4xl font-bold text-purple-400">{formatarMoeda(valorTotalFaturado)}</p>
                <p className="text-sm text-purple-300">Total Faturado</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Valores em Aberto */}
        <Card
          className="border-2 border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-red-500/10 hover:shadow-lg hover:shadow-orange-500/20 transition-all group cursor-pointer"
          title="Valores ainda não recebidos"
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-orange-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <AlertCircle className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-4xl font-bold text-orange-400">{formatarMoeda(valorAReceber)}</p>
                <p className="text-sm text-orange-300">Valores em Aberto</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Valores Recebidos */}
        <Card
          className="border-2 border-green-500/30 bg-gradient-to-br from-green-500/10 to-emerald-500/10 hover:shadow-lg hover:shadow-green-500/20 transition-all group cursor-pointer"
          title="Valores já recebidos dos clientes"
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <CheckCircle2 className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-4xl font-bold text-green-400">{formatarMoeda(valorRecebido)}</p>
                <p className="text-sm text-green-300">Valores Recebidos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ticket Médio */}
        <Card
          className="border-2 border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 hover:shadow-lg hover:shadow-cyan-500/20 transition-all group cursor-pointer"
          title="Valor médio faturado por cliente"
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-cyan-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-4xl font-bold text-cyan-400">{formatarMoeda(ticketMedio)}</p>
                <p className="text-sm text-cyan-300">Ticket Médio</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Distribuição de Pagamentos */}
        <Card className="border-2 border-green-500/20 bg-gray-800/50 backdrop-blur shadow-xl">
          <CardHeader className="border-b border-green-500/20 bg-gray-800/30">
            <CardTitle className="text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              Distribuição de Pagamentos
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {distribuicaoPagamentos.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={distribuicaoPagamentos}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {distribuicaoPagamentos.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                Nenhum dado disponível no período
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gráfico de Evolução */}
        <Card className="border-2 border-green-500/20 bg-gray-800/50 backdrop-blur shadow-xl">
          <CardHeader className="border-b border-green-500/20 bg-gray-800/30">
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Evolução de Faturamento
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={getDadosEvolucao()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="periodo" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" tickFormatter={(value) => formatarMoeda(value)} />
                <ChartTooltip
                  formatter={(value) => formatarMoeda(value)}
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #10b981' }}
                />
                <Line type="monotone" dataKey="valor" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Clientes Faturados */}
      <Card className="border-2 border-green-500/20 bg-gray-800/50 backdrop-blur shadow-xl">
        <CardHeader className="border-b border-green-500/20 bg-gray-800/30">
          <CardTitle className="flex items-center gap-2 text-white">
            <Users className="w-5 h-5 text-green-500" />
            Clientes com Faturamento Ativo
          </CardTitle>
          {/* Search Input for Clients */}
          <div className="flex items-center gap-3 mt-4">
            <Search className="w-5 h-5 text-green-500" />
            <Input
              placeholder="Buscar por nome, telefone ou email..."
              value={buscaCliente}
              onChange={(e) => setBuscaCliente(e.target.value)}
              className="flex-1 border-none bg-gray-700/50 focus-visible:ring-0 text-white placeholder:text-gray-500"
            />
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clientesComFaturamento.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">Nenhum cliente com faturamento ativo encontrado</p>
              </div>
            ) : (
              clientesComFaturamento.map((cliente) => {
                const servicosCliente = servicosFaturados.filter(s => s.cliente_id === cliente.id);
                const totalCliente = servicosCliente.reduce((sum, s) => sum + (s.valor_total || 0), 0);
                const servicosPendentesCliente = servicosCliente.filter(s => s.faturado_status === "pendente").length;

                const faturamentoType = cliente.tipo_pagamento === "FATURAMENTO_AUTOMATICO" ? "Automático" : "Manual";

                return (
                  <Card
                    key={cliente.id}
                    className="border border-green-500/20 bg-gray-700/30 hover:bg-gray-700/50 hover:border-green-500/40 transition-all cursor-pointer group"
                    onClick={() => abrirDetalhesCliente(cliente)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-bold text-white group-hover:text-green-400 transition-colors">{cliente.nome}</h3>
                          <Badge variant="outline" className="mt-1 text-xs border-green-500/30 text-green-400">
                            {faturamentoType}
                          </Badge>
                        </div>
                        <Eye className="w-5 h-5 text-gray-400 group-hover:text-green-400 transition-colors" />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Total Faturado:</span>
                          <span className="font-semibold text-green-400">{formatarMoeda(totalCliente)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Serviços Pendentes:</span>
                          <Badge className="bg-yellow-500/20 text-yellow-400">{servicosPendentesCliente}</Badge>
                        </div>
                        {cliente.ultimo_fechamento && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Último Fechamento:</span>
                            <span className="text-gray-300">{formatarDataSegura(cliente.ultimo_fechamento)}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Detalhes do Cliente */}
      <Dialog open={dialogDetalhes} onOpenChange={setDialogDetalhes}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-gray-800 border-2 border-green-500/30">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-6 h-6 text-green-500" />
                {clienteSelecionado?.nome}
              </div>
              <Button
                onClick={abrirFechamentoManual}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
              >
                <FileText className="w-4 h-4 mr-2" />
                Fechamento Manual
              </Button>
            </DialogTitle>
          </DialogHeader>

          {clienteSelecionado && (
            <div className="space-y-6">
              {/* Informações do Cliente */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-700/30 rounded-lg border border-green-500/20">
                <div>
                  <p className="text-xs text-gray-500">Tipo de Faturamento</p>
                  <Badge className={getTipoPagamentoBadge(clienteSelecionado.tipo_pagamento).color}>
                    {getTipoPagamentoBadge(clienteSelecionado.tipo_pagamento).text}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Dias de Fechamento</p>
                  <p className="font-semibold text-white">
                    {clienteSelecionado.dias_fechamento?.join(', ') || "Manual"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Regra de Vencimento</p>
                  <p className="font-semibold text-white">
                    {clienteSelecionado.regra_vencimento === "dia_fixo"
                      ? `Dia ${clienteSelecionado.dia_vencimento_fixo}`
                      : "5 dias úteis"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Último Fechamento</p>
                  <p className="font-semibold text-white">
                    {clienteSelecionado.ultimo_fechamento ? formatarDataSegura(clienteSelecionado.ultimo_fechamento) : "-"}
                  </p>
                </div>
              </div>

              {/* Histórico de Fechamentos */}
              <div>
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-green-500" />
                  Histórico de Fechamentos
                </h3>
                <div className="space-y-3">
                  {fechamentos
                    .filter(f => f.cliente_id === clienteSelecionado.id)
                    .sort((a, b) => {
                      try {
                        const dateA = a.data_fechamento ? new Date(a.data_fechamento).getTime() : 0;
                        const dateB = b.data_fechamento ? new Date(b.data_fechamento).getTime() : 0;
                        return dateB - dateA;
                      } catch {
                        return 0;
                      }
                    })
                    .slice(0, 10) // Limit to last 10 fechamentos for brevity in dialog
                    .map((fechamento) => (
                      <Card
                        key={fechamento.id}
                        className="border border-green-500/20 bg-gray-700/30 hover:bg-gray-700/50 transition-all"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-3 flex-wrap">
                                <Badge className="bg-green-500/20 text-green-300 border-green-500/30 font-bold text-sm">
                                  {fechamento.numero_fechamento || `#${fechamento.id.slice(-5)}`}
                                </Badge>
                                <Badge className={
                                  fechamento.status === "Pago"
                                    ? "bg-green-500 text-white"
                                    : "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
                                }>
                                  {fechamento.status}
                                </Badge>
                                <Badge variant="outline" className="text-xs border-gray-600 text-gray-400">
                                  {fechamento.tipo_fechamento}
                                </Badge>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                <div>
                                  <p className="text-xs text-gray-500">Período</p>
                                  <p className="text-white font-medium">
                                    {formatarDataSegura(fechamento.periodo_inicio)} - {formatarDataSegura(fechamento.periodo_fim)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Vencimento</p>
                                  <p className="text-white font-medium">
                                    {formatarDataSegura(fechamento.data_vencimento)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Serviços</p>
                                  <p className="text-white font-medium">
                                    {fechamento.quantidade_servicos}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Valor Total</p>
                                  <p className="text-green-400 font-bold text-lg">
                                    {formatarMoeda(fechamento.valor_total)}
                                  </p>
                                </div>
                              </div>

                              {fechamento.status === "Pago" && fechamento.data_pagamento && (
                                <div className="flex items-center gap-2 text-xs text-green-400">
                                  <CheckCircle2 className="w-4 h-4" />
                                  Pago em {formatarDataSegura(fechamento.data_pagamento)}
                                </div>
                              )}

                              {fechamento.observacoes && (
                                <p className="text-xs text-gray-400 italic">
                                  Obs: {fechamento.observacoes}
                                </p>
                              )}
                            </div>

                            <div className="flex flex-col gap-2 min-w-[130px]">
                              {fechamento.status === "Aberto" && (
                                <Button
                                  onClick={() => {
                                    if (window.confirm(`Confirmar o pagamento do fechamento ${fechamento.numero_fechamento || ''} de ${formatarMoeda(fechamento.valor_total)}?\n\nTodas as ${fechamento.quantidade_servicos} OS vinculadas a este fechamento serão marcadas como PAGAS e um lançamento financeiro será liquidado.`)) {
                                      marcarFechamentoPagoMutation.mutate(fechamento);
                                    }
                                  }}
                                  size="sm"
                                  className="bg-green-500 hover:bg-green-600 text-white"
                                  disabled={marcarFechamentoPagoMutation.isPending}
                                >
                                  {marcarFechamentoPagoMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="w-4 h-4 mr-1" />
                                  )}
                                  {marcarFechamentoPagoMutation.isPending ? "Processando..." : "Marcar como Pago"}
                                </Button>
                              )}

                              {fechamento.pdf_url && (
                                <Button
                                  onClick={() => window.open(fechamento.pdf_url, '_blank')}
                                  variant="outline"
                                  size="sm"
                                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                                >
                                  <Download className="w-4 h-4 mr-1" />
                                  PDF
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                  {fechamentos.filter(f => f.cliente_id === clienteSelecionado.id).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-600" />
                      <p>Nenhum fechamento realizado ainda</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Lista de Serviços Faturados */}
              <div>
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-green-500" />
                  Serviços Faturados
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {servicos
                    .filter(s => s.cliente_id === clienteSelecionado.id && s.is_faturado)
                    .sort((a, b) => {
                      try {
                        const dateA = a.created_date ? new Date(a.created_date).getTime() : 0;
                        const dateB = b.created_date ? new Date(b.created_date).getTime() : 0;
                        return dateB - dateA;
                      } catch {
                        return 0;
                      }
                    })
                    .map((servico) => (
                      <Card key={servico.id} className="border border-gray-600 bg-gray-700/30">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                                <div className="text-center">
                                  <div className="text-[8px] text-green-100 font-semibold">OS</div>
                                  <div className="text-sm font-bold text-white">#{servico.numero_pedido}</div>
                                </div>
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <Badge className={statusColors[servico.status_servico] || "bg-gray-500/20 text-gray-400"}>
                                    {servico.status_servico}
                                  </Badge>
                                  {servico.numero_fechamento && (
                                    <Badge variant="outline" className="text-xs border-green-500/30 text-green-400">
                                      {servico.numero_fechamento}
                                    </Badge>
                                  )}
                                  <Badge className={
                                    servico.status_pagamento === "Pago"
                                      ? "bg-green-500 text-white"
                                      : "bg-yellow-500/20 text-yellow-300"
                                  }>
                                    {servico.status_pagamento}
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-400">
                                  {formatarDataSegura(servico.created_date, "dd/MM/yyyy HH:mm")} - {servico.prestador_nome}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold text-green-400">{formatarMoeda(servico.valor_total)}</p>
                              <Badge variant="outline" className="text-xs border-gray-600 text-gray-400">
                                {servico.forma_pagamento}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                  {servicos.filter(s => s.cliente_id === clienteSelecionado.id && s.is_faturado).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-2 text-gray-600" />
                      <p>Nenhum serviço faturado</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Fechamento Manual */}
      <Dialog open={dialogFechamento} onOpenChange={setDialogFechamento}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-gray-800 border-2 border-green-500/30">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Calendar className="w-6 h-6 text-green-500" />
              Fechamento Manual - {clienteSelecionado?.nome}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Configurações do Fechamento */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-700/30 rounded-lg border border-green-500/20">
              <div className="space-y-2">
                <Label className="text-gray-300">Data Início do Período</Label>
                <Input
                  type="date"
                  value={dadosFechamentoManual.periodo_inicio}
                  onChange={(e) => setDadosFechamentoManual({...dadosFechamentoManual, periodo_inicio: e.target.value})}
                  className="bg-gray-700 border-green-500/30 text-white focus:border-green-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Data Fim do Período</Label>
                <Input
                  type="date"
                  value={dadosFechamentoManual.periodo_fim}
                  onChange={(e) => setDadosFechamentoManual({...dadosFechamentoManual, periodo_fim: e.target.value})}
                  className="bg-gray-700 border-green-500/30 text-white focus:border-green-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Data de Vencimento</Label>
                <Input
                  type="date"
                  value={dadosFechamentoManual.data_vencimento}
                  onChange={(e) => setDadosFechamentoManual({...dadosFechamentoManual, data_vencimento: e.target.value})}
                  className="bg-gray-700 border-green-500/30 text-white focus:border-green-500"
                />
              </div>
            </div>

            {/* Opção de Ativar Faturamento */}
            {clienteSelecionado?.tipo_pagamento !== "FATURAMENTO_AUTOMATICO" &&
             clienteSelecionado?.tipo_pagamento !== "FATURAMENTO_MANUAL" && (
              <div className="flex items-center space-x-2 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <Checkbox
                  id="ativar_faturamento"
                  checked={dadosFechamentoManual.ativar_faturamento}
                  onCheckedChange={(checked) => setDadosFechamentoManual({...dadosFechamentoManual, ativar_faturamento: checked})}
                />
                <label htmlFor="ativar_faturamento" className="text-sm font-medium text-gray-300 cursor-pointer flex-1">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-400" />
                    <span>Ativar faturamento manual para este cliente</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Ao ativar, o cliente passará a aparecer no módulo Faturado automaticamente.
                  </p>
                </label>
              </div>
            )}

            {/* Resumo */}
            <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/30">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-gray-400">Serviços Selecionados</p>
                  <p className="text-2xl font-bold text-green-400">{servicosSelecionados.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Valor Total</p>
                  <p className="text-2xl font-bold text-green-400">
                    {formatarMoeda(
                      servicos
                        .filter(s => servicosSelecionados.includes(s.id))
                        .reduce((sum, s) => sum + (s.valor_total || 0), 0)
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Período</p>
                  <p className="text-sm font-semibold text-white">
                    {formatarDataSegura(dadosFechamentoManual.periodo_inicio)} - {formatarDataSegura(dadosFechamentoManual.periodo_fim)}
                  </p>
                </div>
              </div>
            </div>

            {/* Lista de Serviços Disponíveis */}
            <div>
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-500" />
                Serviços Disponíveis para Fechamento
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {servicos
                  .filter(s =>
                    s.cliente_id === clienteSelecionado?.id &&
                    s.is_faturado &&
                    s.faturado_status === "pendente" &&
                    !verificarOSDuplicada(s.numero_pedido)
                  )
                  .map((servico) => (
                    <Card
                      key={servico.id}
                      className={`border cursor-pointer transition-all ${
                        servicosSelecionados.includes(servico.id)
                          ? 'border-green-500 bg-green-500/10'
                          : 'border-gray-600 bg-gray-700/30 hover:bg-gray-700/50'
                      }`}
                      onClick={() => handleToggleServico(servico.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={servicosSelecionados.includes(servico.id)}
                              onCheckedChange={() => handleToggleServico(servico.id)}
                            />
                            <div>
                              <p className="font-semibold text-white">OS #{servico.numero_pedido}</p>
                              <p className="text-sm text-gray-400">
                                {formatarDataSegura(servico.created_date, "dd/MM/yyyy HH:mm")} - {servico.prestador_nome}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-green-400">{formatarMoeda(servico.valor_total)}</p>
                            <Badge variant="outline" className="text-xs border-gray-600 text-gray-400">
                              {servico.forma_pagamento}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                {servicos.filter(s =>
                  s.cliente_id === clienteSelecionado?.id &&
                  s.is_faturado &&
                  s.faturado_status === "pendente" &&
                  !verificarOSDuplicada(s.numero_pedido)
                ).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-2 text-gray-600" />
                    <p>Nenhum serviço disponível para fechamento</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Todos os serviços faturados já foram fechados ou ainda não foram marcados como faturados.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <Label className="text-gray-300">Observações do Fechamento</Label>
              <Textarea
                value={dadosFechamentoManual.observacoes}
                onChange={(e) => setDadosFechamentoManual({...dadosFechamentoManual, observacoes: e.target.value})}
                placeholder="Adicione observações relevantes sobre este fechamento..."
                rows={3}
                className="bg-gray-700 border-green-500/30 text-white focus:border-green-500"
              />
            </div>

            {/* Botões */}
            <div className="flex justify-end gap-3 pt-4 border-t border-green-500/20">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogFechamento(false)}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmarFechamento}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                disabled={servicosSelecionados.length === 0 || createFechamentoMutation.isPending}
              >
                {createFechamentoMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Confirmar Fechamento
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
