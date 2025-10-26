
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Edit,
  Trash2,
  Search,
  Calendar,
  Filter,
  CheckCircle,
  Clock,
  Repeat,
  FolderOpen,
  Tag,
  Download,
  AlertCircle,
  FileText,
  Bell,
  X,
  ChevronDown,
  ChevronUp,
  Truck
} from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, subMonths, isToday, isPast, parseISO, addHours, differenceInHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import AutocompleteDescricao from "@/components/financeiro/AutocompleteDescricao";
import { CurrencyInput } from "@/components/ui/currency-input";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, Area, AreaChart } from "recharts";
import { getTodayBrasilia } from "@/components/utils/dateUtils";

export default function Financeiro() {
  // Helper function to create a Date object interpreted as start of day in Brasilia timezone
  const createDateFromBrasiliaString = (dateString) => {
    if (!dateString) return null;
    try {
      // Appends 'T00:00:00-03:00' to the date string to explicitly define it as start of day in UTC-3
      const date = new Date(`${dateString}T00:00:00-03:00`);
      // Check if the date is valid after creation
      if (isNaN(date.getTime())) {
        console.warn('Invalid date created from string:', dateString);
        return null;
      }
      return date;
    } catch (error) {
      console.error('Erro ao criar data a partir da string:', error, dateString);
      return null;
    }
  };

  // Helper para formatar datas com segurança
  const formatarDataSegura = (data, formatString = 'dd/MM/yyyy') => {
    if (!data) return '-';
    try {
      const dataObj = createDateFromBrasiliaString(data);
      if (!dataObj || isNaN(dataObj.getTime())) return '-';
      return format(dataObj, formatString, { locale: ptBR });
    } catch (error) {
      console.error('Erro ao formatar data:', error, data);
      return '-';
    }
  };

  const formatDateTime = (isoString, formatStr = 'dd/MM/yyyy HH:mm') => {
    if (!isoString) return '-';
    try {
      const date = parseISO(isoString);
      if (isNaN(date.getTime())) {
        console.warn('Invalid date created from ISO string:', isoString);
        return '-';
      }
      return format(date, formatStr, { locale: ptBR });
    } catch (error) {
      console.error('Erro ao formatar data/hora:', error, isoString);
      return '-';
    }
  };

  const createPageUrl = (pageName) => {
    // This is a simple helper assuming direct page names.
    // In a real Next.js app, you'd use Next.js Router for this.
    // For the purpose of this isolated component, we simulate it.
    const baseUrl = window.location.origin;
    return `${baseUrl}/${pageName.toLowerCase()}`; // e.g., /servicos
  };


  // Initial state values for dates, adjusted for Brasilia timezone
  const initialBrasiliaToday = getTodayBrasilia(); // Assumed to return 'YYYY-MM-DD' in Brasilia
  const initialBrasiliaStartOfMonth = format(startOfMonth(createDateFromBrasiliaString(initialBrasiliaToday)), 'yyyy-MM-dd');
  const initialBrasiliaEndOfMonth = format(endOfMonth(createDateFromBrasiliaString(initialBrasiliaToday)), 'yyyy-MM-dd');

  const [dialogAberto, setDialogAberto] = useState(false);
  const [dialogEdicao, setDialogEdicao] = useState(false);
  const [dialogCategoria, setDialogCategoria] = useState(false);
  const [dialogCentroCusto, setDialogCentroCusto] = useState(false);
  const [dialogDetalhes, setDialogDetalhes] = useState(false);
  const [dialogNotificacao, setDialogNotificacao] = useState(false);
  const [lancamentosDetalhados, setLancamentosDetalhados] = useState([]);
  const [lancamentosVencidos, setLancamentosVencidos] = useState([]);
  const [tituloDetalhes, setTituloDetalhes] = useState("");
  const [tipoDetalhes, setTipoDetalhes] = useState("");
  const [lancamentoSelecionado, setLancamentoSelecionado] = useState(null);
  const [busca, setBusca] = useState("");
  const [dataInicio, setDataInicio] = useState(initialBrasiliaStartOfMonth); // Adjusted
  const [dataFim, setDataFim] = useState(initialBrasiliaEndOfMonth); // Adjusted
  const [tipoFiltro, setTipoFiltro] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");
  const [centroCustoFiltro, setCentroCustoFiltro] = useState("");
  const [periodoEvolucao, setPeriodoEvolucao] = useState("Mensal");
  const [metricaGrafico, setMetricaGrafico] = useState("receitas_despesas");
  const [ultimaNotificacao, setUltimaNotificacao] = useState(null);
  const [user, setUser] = useState(null);

  // NEW: State for expandable services section
  const [servicosExpandido, setServicosExpandido] = useState(false);
  const [editandoServico, setEditandoServico] = useState(null); // Not strictly used for dialog, but for potential future inline editing

  React.useEffect(() => {
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

  const [formData, setFormData] = useState({
    tipo: "Receita",
    descricao: "",
    valor: "",
    categoria: "",
    centro_custo_id: "",
    prestador_id: "",
    cliente_id: "",
    data_lancamento: initialBrasiliaToday, // Adjusted
    data_vencimento: "",
    status_pagamento: "Pendente",
    incluir_financeiro_geral: true,
    recorrente: false,
    parcelas: 1,
    periodicidade: "Mensal",
    observacoes: ""
  });

  const [novaCategoria, setNovaCategoria] = useState({
    nome: "",
    tipo: "Ambos",
    descricao: ""
  });

  const [novoCentroCusto, setNovoCentroCusto] = useState({
    nome: "",
    descricao: "",
    cor: "#00ff66"
  });

  const queryClient = useQueryClient();

  const { data: lancamentos = [], isLoading } = useQuery({
    queryKey: ['lancamentos'],
    queryFn: () => base44.entities.Lancamento.list('-data_lancamento'),
    refetchInterval: 5000
  });

  const { data: categorias = [] } = useQuery({
    queryKey: ['categorias'],
    queryFn: () => base44.entities.Categoria.list(),
    refetchInterval: 10000 // ✅ Atualização automática
  });

  const { data: centrosCusto = [] } = useQuery({
    queryKey: ['centroscusto'],
    queryFn: () => base44.entities.CentroCusto.list(),
    refetchInterval: 10000 // ✅ Atualização automática
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list('nome'),
    refetchInterval: 10000 // ✅ Atualização automática
  });

  const { data: prestadores = [] } = useQuery({
    queryKey: ['prestadores'],
    queryFn: () => base44.entities.Prestador.list('nome'),
    refetchInterval: 10000 // ✅ Atualização automática
  });

  // NEW: Query for Servico entities
  const { data: servicos = [] } = useQuery({
    queryKey: ['servicos'],
    queryFn: () => base44.entities.Servico.list('-created_date'),
    refetchInterval: 5000 // Automatic update (Updated from 10000 to 5000 as per outline)
  });

  // VERIFICAR VENCIMENTOS E NOTIFICAR
  useEffect(() => {
    const verificarVencimentos = () => {
      const agora = new Date(); // Current system time for notification interval
      const hojeBrasiliaStartOfDay = createDateFromBrasiliaString(getTodayBrasilia()); // Start of today in Brasilia

      const vencidosHoje = lancamentos.filter(l => {
        if (l.status_pagamento !== "Pendente" || !l.data_vencimento) return false;
        if (l.servico_id) return false; // NEW: Exclude lancamentos linked to services from general notifications

        const dataVenc = createDateFromBrasiliaString(l.data_vencimento);
        if (!dataVenc || isNaN(dataVenc.getTime())) return false; // Handle null or invalid date

        // A lancamento is "vencido hoje" if its vencimento date (start of day Brasilia)
        // is on or before the start of today (Brasilia)
        return dataVenc <= hojeBrasiliaStartOfDay;
      });

      // NEW: Also check for Servico vencimentos
      const servicosVencidosHoje = servicos.filter(s => {
        if (s.status_pagamento !== "Pendente" || !s.data_vencimento) return false;
        
        const dataVenc = createDateFromBrasiliaString(s.data_vencimento);
        if (!dataVenc || isNaN(dataVenc.getTime())) return false;

        return dataVenc <= hojeBrasiliaStartOfDay;
      });

      const allVencidos = [...vencidosHoje, ...servicosVencidosHoje];

      if (allVencidos.length > 0) {
        const ultimaNotifStr = localStorage.getItem('ultima_notificacao_financeiro');
        const ultimaNotif = ultimaNotifStr ? new Date(ultimaNotifStr) : null;
        
        // Mostrar notificação se nunca foi exibida ou se passou 6 horas
        if (!ultimaNotif || differenceInHours(agora, ultimaNotif) >= 6) {
          setLancamentosVencidos(allVencidos); // Can contain both Lancamento and Servico objects
          setDialogNotificacao(true);
          localStorage.setItem('ultima_notificacao_financeiro', agora.toISOString());
          setUltimaNotificacao(agora);
        }
      }
    };

    verificarVencimentos();
    const interval = setInterval(verificarVencimentos, 60000); // Verificar a cada minuto
    return () => clearInterval(interval);
  }, [lancamentos, servicos]); // Include servicos in dependency array


  const createMutation = useMutation({
    mutationFn: async (data) => {
      const currentUser = await base44.auth.me();
      data.criado_por_nome = currentUser?.full_name || "Usuário";
      data.criado_por_email = currentUser?.email || "";
      
      // Criar lançamento principal
      if (data.recorrente && data.parcelas > 1) {
        const lancamentoPai = await base44.entities.Lancamento.create({
          ...data,
          parcelas: data.parcelas
        });

        // Parse base dates explicitly for Brasilia timezone (UTC-3)
        const dataBase = createDateFromBrasiliaString(data.data_lancamento);
        const dataVencimentoBase = data.data_vencimento ? createDateFromBrasiliaString(data.data_vencimento) : null;
        
        if (!dataBase || isNaN(dataBase.getTime())) {
          console.error("Data base inválida para lançamentos recorrentes:", data.data_lancamento);
          throw new Error("Data base inválida para lançamentos recorrentes.");
        }

        const parcelasArray = [];

        for (let i = 1; i < data.parcelas; i++) {
          const novaData = new Date(dataBase); // Clone the Date object
          const novaDataVenc = dataVencimentoBase ? new Date(dataVencimentoBase) : null; // Clone if exists

          if (data.periodicidade === "Mensal") {
            novaData.setMonth(dataBase.getMonth() + i);
            if (novaDataVenc) novaDataVenc.setMonth(dataVencimentoBase.getMonth() + i);
          } else if (data.periodicidade === "Semanal") {
            novaData.setDate(dataBase.getDate() + (i * 7));
            if (novaDataVenc) novaDataVenc.setDate(dataVencimentoBase.getDate() + (i * 7));
          } else if (data.periodicidade === "Diário") {
            novaData.setDate(dataBase.getDate() + i);
            if (novaDataVenc) novaDataVenc.setDate(dataVencimentoBase.getDate() + i);
          }

          parcelasArray.push({
            ...data,
            data_lancamento: format(novaData, 'yyyy-MM-dd'),
            data_vencimento: novaDataVenc && !isNaN(novaDataVenc.getTime()) ? format(novaDataVenc, 'yyyy-MM-dd') : null,
            descricao: `${data.descricao} (Parcela ${i + 1}/${data.parcelas})`,
            status_pagamento: "Pendente"
          });
        }

        if (parcelasArray.length > 0) {
          await base44.entities.Lancamento.bulkCreate(parcelasArray);
        }

        // Se não incluir no financeiro geral E tiver prestador, criar no caixa do prestador
        if (data.prestador_id && !data.incluir_financeiro_geral) {
          const prestador = prestadores.find(p => p.id === data.prestador_id);
          
          // Create LancamentoPrestador for the parent (first entry)
          await base44.entities.LancamentoPrestador.create({
            prestador_id: data.prestador_id,
            prestador_nome: prestador?.nome,
            tipo: data.tipo === "Receita" ? "Receita" : "Despesa",
            descricao: data.descricao,
            valor: data.tipo === "Receita" ? data.valor : -Math.abs(data.valor),
            data_lancamento: data.data_lancamento,
            data_vencimento: data.data_vencimento,
            status_pagamento: data.status_pagamento,
            observacoes: data.observacoes,
            incluir_financeiro_geral: false
          });

          // Criar parcelas no caixa do prestador também
          for (let i = 1; i < data.parcelas; i++) {
            const novaData = new Date(dataBase);
            const novaDataVenc = dataVencimentoBase ? new Date(dataVencimentoBase) : null;

            if (data.periodicidade === "Mensal") {
              novaData.setMonth(dataBase.getMonth() + i);
              if (novaDataVenc) novaDataVenc.setMonth(dataVencimentoBase.getMonth() + i);
            } else if (data.periodicidade === "Semanal") {
              novaData.setDate(dataBase.getDate() + (i * 7));
              if (novaDataVenc) novaDataVenc.setDate(dataVencimentoBase.getDate() + (i * 7));
            } else if (data.periodicidade === "Diário") {
              novaData.setDate(dataBase.getDate() + i);
              if (novaDataVenc) novaDataVenc.setDate(dataVencimentoBase.getDate() + i);
            }

            await base44.entities.LancamentoPrestador.create({
              prestador_id: data.prestador_id,
              prestador_nome: prestador?.nome,
              tipo: data.tipo === "Receita" ? "Receita" : "Despesa",
              descricao: `${data.descricao} (Parcela ${i + 1}/${data.parcelas})`,
              valor: data.tipo === "Receita" ? data.valor : -Math.abs(data.valor),
              data_lancamento: format(novaData, 'yyyy-MM-dd'),
              data_vencimento: novaDataVenc && !isNaN(novaDataVenc.getTime()) ? format(novaDataVenc, 'yyyy-MM-dd') : null,
              status_pagamento: "Pendente",
              observacoes: data.observacoes,
              incluir_financeiro_geral: false
            });
          }
        }

        return lancamentoPai;
      } else {
        const lancamento = await base44.entities.Lancamento.create(data);

        // Se não incluir no financeiro geral E tiver prestador, criar no caixa do prestador
        if (data.prestador_id && !data.incluir_financeiro_geral) {
          const prestador = prestadores.find(p => p.id === data.prestador_id);
          await base44.entities.LancamentoPrestador.create({
            prestador_id: data.prestador_id,
            prestador_nome: prestador?.nome,
            tipo: data.tipo === "Receita" ? "Receita" : "Despesa",
            descricao: data.descricao,
            valor: data.tipo === "Receita" ? data.valor : -Math.abs(data.valor),
            data_lancamento: data.data_lancamento,
            data_vencimento: data.data_vencimento,
            status_pagamento: data.status_pagamento,
            observacoes: data.observacoes,
            incluir_financeiro_geral: false
          });
        }

        return lancamento;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['lancamentos']);
      queryClient.invalidateQueries(['lancamentosprestador']);
      setDialogAberto(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const currentUser = await base44.auth.me();
      data.alterado_por_nome = currentUser?.full_name || "Usuário";
      data.alterado_por_email = currentUser?.email || "";
      data.data_alteracao = new Date().toISOString();
      
      return base44.entities.Lancamento.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['lancamentos']);
      setDialogEdicao(false);
      setLancamentoSelecionado(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Lancamento.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['lancamentos']);
    }
  });

  const createCategoriaMutation = useMutation({
    mutationFn: (data) => base44.entities.Categoria.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['categorias']);
      setDialogCategoria(false);
      setNovaCategoria({ nome: "", tipo: "Ambos", descricao: "" });
    }
  });

  const createCentroCustoMutation = useMutation({
    mutationFn: (data) => base44.entities.CentroCusto.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['centroscusto']);
      setDialogCentroCusto(false);
      setNovoCentroCusto({ nome: "", descricao: "", cor: "#00ff66" });
    }
  });

  // NEW: Mutation to delete a Servico and its associated financial records
  const excluirServicoMutation = useMutation({
    mutationFn: async (id) => {
      const servicoToDelete = servicos.find(s => s.id === id);
      if (!servicoToDelete) throw new Error("Serviço não encontrado");

      // Delete financial entries linked to this service
      const lancamentosLinkedToService = await base44.entities.Lancamento.filter({ servico_id: id });
      for (const lanc of lancamentosLinkedToService) {
        await base44.entities.Lancamento.delete(lanc.id);
      }

      // Delete prestador financial entries linked to this service
      const lancPrestadorLinkedToService = await base44.entities.LancamentoPrestador.filter({ servico_id: id });
      for (const lanc of lancPrestadorLinkedToService) {
        await base44.entities.LancamentoPrestador.delete(lanc.id);
      }

      // Finally, delete the service itself
      await base44.entities.Servico.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['servicos']);
      queryClient.invalidateQueries(['lancamentos']);
      queryClient.invalidateQueries(['lancamentosprestador']);
      alert("✅ Serviço excluído com sucesso!");
    },
    onError: (error) => {
      alert("❌ Erro ao excluir serviço: " + error.message);
      console.error("Erro ao excluir serviço:", error);
    }
  });

  const resetForm = () => {
    setFormData({
      tipo: "Receita",
      descricao: "",
      valor: "",
      categoria: "",
      centro_custo_id: "",
      prestador_id: "",
      cliente_id: "",
      data_lancamento: getTodayBrasilia(), // Adjusted
      data_vencimento: "",
      status_pagamento: "Pendente",
      incluir_financeiro_geral: true,
      recorrente: false,
      parcelas: 1,
      periodicidade: "Mensal",
      observacoes: ""
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const parsedValor = typeof formData.valor === 'string' ? parseFloat(formData.valor.replace(',', '.')) : formData.valor;
    const dataToSend = {
      ...formData,
      valor: parsedValor,
      data_vencimento: formData.data_vencimento || null,
      centro_custo_id: formData.centro_custo_id || null, // Convert empty string to null
      prestador_id: formData.prestador_id || null,     // Convert empty string to null
      cliente_id: formData.cliente_id || null          // Convert empty string to null
    };
    createMutation.mutate(dataToSend);
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    const parsedValor = typeof lancamentoSelecionado.valor === 'string' ? parseFloat(lancamentoSelecionado.valor.replace(',', '.')) : lancamentoSelecionado.valor;
    const dataToSend = {
      ...lancamentoSelecionado,
      valor: parsedValor,
      data_vencimento: lancamentoSelecionado.data_vencimento || null,
      centro_custo_id: lancamentoSelecionado.centro_custo_id || null, // Convert empty string to null
      prestador_id: lancamentoSelecionado.prestador_id || null,     // Convert empty string to null
      cliente_id: lancamentoSelecionado.cliente_id || null          // Convert empty string to null
    };
    updateMutation.mutate({ id: lancamentoSelecionado.id, data: dataToSend });
  };

  const handleSubmitCategoria = (e) => {
    e.preventDefault();
    createCategoriaMutation.mutate(novaCategoria);
  };

  const handleSubmitCentroCusto = (e) => {
    e.preventDefault();
    createCentroCustoMutation.mutate(novoCentroCusto);
  };

  const abrirEdicao = (lancamento) => {
    const lancamentoToEdit = {
      ...lancamento,
      // When displaying in an input type="date", format from a Date object created with Brasilia timezone
      data_vencimento: lancamento.data_vencimento ? format(createDateFromBrasiliaString(lancamento.data_vencimento), 'yyyy-MM-dd') : "",
      valor: lancamento.valor ? lancamento.valor.toString().replace('.', ',') : "",
      centro_custo_id: lancamento.centro_custo_id || "", // Ensure empty string for Select
      prestador_id: lancamento.prestador_id || "",
      cliente_id: lancamento.cliente_id || "",
      // Ensure incluir_financeiro_geral is explicitly boolean for checkbox
      incluir_financeiro_geral: lancamento.incluir_financeiro_geral !== false,
    };
    setLancamentoSelecionado({...lancamentoToEdit});
    setDialogEdicao(true);
  };

  const handleExcluir = (e, lancamento) => {
    e.stopPropagation();
    if (window.confirm(`Tem certeza que deseja excluir o lançamento "${lancamento.descricao}"?`)) {
      deleteMutation.mutate(lancamento.id);
    }
  };

  const handleMarcarPago = (e, lancamento) => {
    e.stopPropagation();
    const novoStatus = lancamento.status_pagamento === "Pendente" ? (lancamento.tipo === "Receita" ? "Recebido" : "Pago") : "Pendente";
    updateMutation.mutate({
      id: lancamento.id,
      data: { ...lancamento, status_pagamento: novoStatus }
    });
  };

  // NEW: handleMarcarPago for Servico entities
  const handleMarcarServicoPago = async (servico) => {
    try {
      await base44.entities.Servico.update(servico.id, { status_pagamento: "Pago" });
      queryClient.invalidateQueries(['servicos']);
      // If a service is paid, any linked pending Lancamento (e.g. from service creation) should also be marked as paid/received.
      // This logic might need to be more robust depending on how services create financial entries.
      const linkedLancamentos = await base44.entities.Lancamento.filter({ servico_id: servico.id, status_pagamento: "Pendente" });
      for (const lanc of linkedLancamentos) {
        const newStatus = lanc.tipo === "Receita" ? "Recebido" : "Pago";
        await base44.entities.Lancamento.update(lanc.id, { status_pagamento: newStatus });
      }
      queryClient.invalidateQueries(['lancamentos']);
    } catch (error) {
      console.error("Erro ao marcar serviço como pago:", error);
      alert("Erro ao marcar serviço como pago.");
    }
  };


  const handleMarcarPagoDetalhes = (lancamento) => {
    // Determine if it's a Lancamento or Servico based on available properties
    if (lancamento.hasOwnProperty('numero_pedido') || lancamento.hasOwnProperty('valor_total')) { // Likely a Servico entity
      handleMarcarServicoPago(lancamento);
    } else { // Likely a Lancamento entity
      const novoStatus = lancamento.tipo === "Receita" ? "Recebido" : "Pago";
      updateMutation.mutate({
        id: lancamento.id,
        data: { ...lancamento, status_pagamento: novoStatus }
      });
    }
  };


  const handleAutocompleteChange = (descricao, clienteId, prestadorId) => {
    setFormData({
      ...formData,
      descricao,
      cliente_id: clienteId || "",
      prestador_id: prestadorId || ""
    });
  };

  // NEW: Filter Lancamento entities, excluding those linked to Servico entities
  const lancamentosFiltrados = lancamentos.filter(l => {
    // Ensure all dates are parsed consistently with Brasilia timezone for filtering
    const dataLanc = createDateFromBrasiliaString(l.data_lancamento);
    const inicio = createDateFromBrasiliaString(dataInicio);
    let fim = createDateFromBrasiliaString(dataFim);
    
    // Defensive check for invalid dates
    if (!dataLanc || isNaN(dataLanc.getTime()) || !inicio || isNaN(inicio.getTime()) || !fim || isNaN(fim.getTime())) {
      return false;
    }
    
    fim.setHours(23, 59, 59, 999); // Set to end of day in Brasilia timezone

    const dentroData = dataLanc >= inicio && dataLanc <= fim;
    const matchBusca = !busca || l.descricao?.toLowerCase().includes(busca.toLowerCase()) || l.categoria?.toLowerCase().includes(busca.toLowerCase());
    const matchTipo = !tipoFiltro || l.tipo === tipoFiltro;
    const matchStatus = !statusFiltro || l.status_pagamento === statusFiltro;
    const matchCentroCusto = !centroCustoFiltro || l.centro_custo_id === centroCustoFiltro;
    
    // IMPORTANTE: Mostrar apenas lançamentos que estão incluídos no financeiro geral
    const incluido = l.incluir_financeiro_geral !== false;

    // NEW: Exclude Lancamentos that are linked to a Servico entity, as they are managed separately
    const isLinkedToService = l.servico_id;

    return dentroData && matchBusca && matchTipo && matchStatus && matchCentroCusto && incluido && !isLinkedToService;
  });

  // NEW: Service entity related filtering and aggregation for the *list*
  const servicosFinanceiro = servicos.filter(s => {
    const dataCriacaoServico = createDateFromBrasiliaString(s.created_date ? format(parseISO(s.created_date), 'yyyy-MM-dd') : null);
    const inicio = createDateFromBrasiliaString(dataInicio);
    let fim = createDateFromBrasiliaString(dataFim);

    if (!dataCriacaoServico || isNaN(dataCriacaoServico.getTime()) || !inicio || isNaN(inicio.getTime()) || !fim || isNaN(fim.getTime())) {
      return false;
    }
    fim.setHours(23, 59, 59, 999);

    const dentroData = dataCriacaoServico >= inicio && dataCriacaoServico <= fim;
    const matchBuscaServico = !busca || s.cliente_nome_avulso?.toLowerCase().includes(busca.toLowerCase()) ||
                              s.prestador_nome?.toLowerCase().includes(busca.toLowerCase()) ||
                              s.status_servico?.toLowerCase().includes(busca.toLowerCase());
    // Only show services that are not yet invoiced (faturado) or explicitly included in financial view (e.g., if still pending).
    // The previous logic `!s.is_faturado || s.status_pagamento === "Pendente"` already covered this.
    // However, for the *list*, we generally want to see items that are relevant to manage.
    const isRelevantForFinance = !s.is_faturado || s.status_pagamento === "Pendente";
    
    return dentroData && matchBuscaServico && isRelevantForFinance;
  });

  // ✅ CÁLCULOS CORRIGIDOS - BASEADOS NA LISTAGEM FILTRADA
  // Filtrar SERVIÇOS com os mesmos critérios da listagem
  const servicosFiltrados = servicos.filter(s => {
    const dataCriacaoServico = createDateFromBrasiliaString(s.created_date ? format(parseISO(s.created_date), 'yyyy-MM-dd') : null);
    const inicio = createDateFromBrasiliaString(dataInicio);
    let fim = createDateFromBrasiliaString(dataFim);

    if (!dataCriacaoServico || isNaN(dataCriacaoServico.getTime()) || !inicio || isNaN(inicio.getTime()) || !fim || isNaN(fim.getTime())) {
      return false;
    }
    fim.setHours(23, 59, 59, 999);

    const dentroData = dataCriacaoServico >= inicio && dataCriacaoServico <= fim;
    const matchBuscaServico = !busca || s.cliente_nome_avulso?.toLowerCase().includes(busca.toLowerCase()) ||
                              s.prestador_nome?.toLowerCase().includes(busca.toLowerCase()) ||
                              s.status_servico?.toLowerCase().includes(busca.toLowerCase());
    
    // Aplicar filtro de status se houver
    const matchStatus = !statusFiltro || s.status_pagamento === statusFiltro;
    
    // Apenas serviços não faturados (não vinculados a fechamentos)
    const isRelevantForFinance = !s.is_faturado && !s.fechamento_id;
    
    return dentroData && matchBuscaServico && matchStatus && isRelevantForFinance;
  });

  // 1️⃣ RECEITAS RECEBIDAS (Lançamentos + Serviços com status "Pago" ou "Recebido")
  const receitasRecebidasLancamentos = lancamentosFiltrados.filter(l => 
    l.tipo === "Receita" && (l.status_pagamento === "Recebido" || l.status_pagamento === "Pago")
  );
  
  const receitasRecebidasServicos = servicosFiltrados.filter(s => 
    s.status_pagamento === "Pago" || s.status_pagamento === "Recebido"
  );
  
  const totalReceitasRecebidas = 
    receitasRecebidasLancamentos.reduce((sum, l) => sum + (l.valor || 0), 0) +
    receitasRecebidasServicos.reduce((sum, s) => sum + (s.valor_total || 0), 0);
  
  const qtdReceitasRecebidas = receitasRecebidasLancamentos.length + receitasRecebidasServicos.length;

  // 2️⃣ DESPESAS PAGAS (Apenas lançamentos, serviços não entram aqui)
  const despesasPagasLancamentos = lancamentosFiltrados.filter(l => 
    l.tipo === "Despesa" && l.status_pagamento === "Pago"
  );
  
  const totalDespesasPagas = despesasPagasLancamentos.reduce((sum, l) => sum + (l.valor || 0), 0);

  // 3️⃣ CONTAS A RECEBER (Lançamentos + Serviços com status "Pendente")
  const contasReceberLancamentos = lancamentosFiltrados.filter(l => 
    l.tipo === "Receita" && l.status_pagamento === "Pendente"
  );
  
  const contasReceberServicos = servicosFiltrados.filter(s => 
    s.status_pagamento === "Pendente"
  );
  
  const totalContasReceber = 
    contasReceberLancamentos.reduce((sum, l) => sum + (l.valor || 0), 0) +
    contasReceberServicos.reduce((sum, s) => sum + (s.valor_total || 0), 0);
  
  const qtdContasReceber = contasReceberLancamentos.length + contasReceberServicos.length;

  // 4️⃣ CONTAS A PAGAR (Apenas lançamentos de despesas pendentes)
  const contasPagarLancamentos = lancamentosFiltrados.filter(l => 
    l.tipo === "Despesa" && l.status_pagamento === "Pendente"
  );
  
  const totalContasPagar = contasPagarLancamentos.reduce((sum, l) => sum + (l.valor || 0), 0);
  const qtdContasPagar = contasPagarLancamentos.length;

  // 5️⃣ SALDO ATUAL = Receitas Recebidas - Despesas Pagas
  const saldoAtual = totalReceitasRecebidas - totalDespesasPagas;

  // Próximos Vencimentos
  const todasContasReceber = [...contasReceberLancamentos, ...contasReceberServicos];
  const proximoVencimentoReceber = todasContasReceber
    .filter(item => item.data_vencimento)
    .sort((a, b) => {
      const dateA = createDateFromBrasiliaString(a.data_vencimento);
      const dateB = createDateFromBrasiliaString(b.data_vencimento);
      
      if (!dateA || isNaN(dateA.getTime())) return 1;
      if (!dateB || isNaN(dateB.getTime())) return -1;

      return dateA.getTime() - dateB.getTime();
    })[0];

  const proximoVencimentoPagar = contasPagarLancamentos
    .filter(item => item.data_vencimento)
    .sort((a, b) => {
      const dateA = createDateFromBrasiliaString(a.data_vencimento);
      const dateB = createDateFromBrasiliaString(b.data_vencimento);
      
      if (!dateA || isNaN(dateA.getTime())) return 1;
      if (!dateB || isNaN(dateB.getTime())) return -1;

      return dateA.getTime() - dateB.getTime();
    })[0];

  // EVOLUÇÃO TEMPORAL
  const calcularEvolucao = () => {
    // Ensure base dates for interval calculation are in Brasilia timezone context
    const inicio = createDateFromBrasiliaString(dataInicio);
    const fim = createDateFromBrasiliaString(dataFim);

    // Defensive check for invalid dates
    if (!inicio || isNaN(inicio.getTime()) || !fim || isNaN(fim.getTime())) {
      console.warn("Datas de início ou fim do período de evolução inválidas.");
      return [];
    }

    let intervalos = [];
    
    if (periodoEvolucao === "Semanal") {
      intervalos = eachWeekOfInterval({ start: inicio, end: fim }, { locale: ptBR });
    } else if (periodoEvolucao === "Mensal") {
      intervalos = eachMonthOfInterval({ start: inicio, end: fim });
    } else { // Diário
      intervalos = eachDayOfInterval({ start: inicio, end: fim });
    }

    return intervalos.map(intervalo => {
      // These 'start' and 'end' of intervals should also be treated as Brasilia local time
      // since the input `intervalo` is derived from `inicio` and `fim` (Brasilia timezone).
      const inicioIntervalo = periodoEvolucao === "Semanal" ? startOfWeek(intervalo, { locale: ptBR }) :
                              periodoEvolucao === "Mensal" ? startOfMonth(intervalo) : intervalo;
      const fimIntervalo = periodoEvolucao === "Semanal" ? endOfWeek(intervalo, { locale: ptBR }) :
                           periodoEvolucao === "Mensal" ? endOfMonth(intervalo) : intervalo;
      
      // Defensive check for interval boundaries
      if (isNaN(inicioIntervalo.getTime()) || isNaN(fimIntervalo.getTime())) {
        console.warn("Intervalo de evolução inválido, pulando:", intervalo);
        return null; // Return null to be filtered out later if needed
      }

      fimIntervalo.setHours(23, 59, 59, 999); // Ensure end of day/week/month for comparison, operates on the Date object's local time (Brasilia)

      // Filter both Lancamentos (not linked to service) and Servico entities
      const lancamentosEvolucao = lancamentos.filter(l => {
        const data = createDateFromBrasiliaString(l.data_lancamento); // Parse lancamento date for Brasilia
        return data && !isNaN(data.getTime()) && data >= inicioIntervalo && data <= fimIntervalo && l.incluir_financeiro_geral !== false && !l.servico_id;
      });

      // For evolution graph, we use the broader `servicosFinanceiro` logic (not just `servicosNaoFaturadosParaIndicadores`)
      // to capture all relevant service activity over time.
      const servicosEvolucao = servicos.filter(s => {
        const data = createDateFromBrasiliaString(s.created_date ? format(parseISO(s.created_date), 'yyyy-MM-dd') : null);
        return data && !isNaN(data.getTime()) && data >= inicioIntervalo && data <= fimIntervalo && (!s.is_faturado || s.status_pagamento === "Pendente");
      });


      const receitasLancamentos = lancamentosEvolucao.filter(l => l.tipo === "Receita" && l.status_pagamento === "Recebido").reduce((s, l) => s + (l.valor || 0), 0);
      const despesasLancamentos = lancamentosEvolucao.filter(l => l.tipo === "Despesa" && l.status_pagamento === "Pago").reduce((s, l) => s + (l.valor || 0), 0);
      const receitasPendentesLancamentos = lancamentosEvolucao.filter(l => l.tipo === "Receita" && l.status_pagamento === "Pendente").reduce((s, l) => s + (l.valor || 0), 0);
      const despesasPendentesLancamentos = lancamentosEvolucao.filter(l => l.tipo === "Despesa" && l.status_pagamento === "Pendente").reduce((s, l) => s + (l.valor || 0), 0);
      
      const receitasServicos = servicosEvolucao.filter(s => s.tipo_servico === "Receita" && s.status_pagamento === "Pago").reduce((s, l) => s + (l.valor_total || 0), 0);
      const despesasServicos = servicosEvolucao.filter(s => s.tipo_servico === "Despesa" && s.status_pagamento === "Pago").reduce((s, l) => s + (l.valor_total || 0), 0);
      const receitasPendentesServicos = servicosEvolucao.filter(s => s.tipo_servico === "Receita" && s.status_pagamento === "Pendente").reduce((s, l) => s + (l.valor_total || 0), 0);
      const despesasPendentesServicos = servicosEvolucao.filter(s => s.tipo_servico === "Despesa" && s.status_pagamento === "Pendente").reduce((s, l) => s + (l.valor_total || 0), 0);


      let periodoLabel = "";
      if (periodoEvolucao === "Mensal") {
        periodoLabel = format(inicioIntervalo, "MMM/yy", { locale: ptBR });
      } else if (periodoEvolucao === "Semanal") {
        periodoLabel = format(inicioIntervalo, "dd/MM", { locale: ptBR });
      } else { // Diário
        periodoLabel = format(inicioIntervalo, "dd", { locale: ptBR });
      }

      return {
        periodo: periodoLabel,
        receitas: receitasLancamentos + receitasServicos,
        despesas: despesasLancamentos + despesasServicos,
        saldo: (receitasLancamentos + receitasServicos) - (despesasLancamentos + despesasServicos),
        lucro: (receitasLancamentos + receitasServicos) - (despesasLancamentos + despesasServicos),
        receitasPendentes: receitasPendentesLancamentos + receitasPendentesServicos,
        despesasPendentes: despesasPendentesLancamentos + despesasPendentesServicos
      };
    }).filter(Boolean); // Filter out any null entries
  };

  const dadosEvolucao = calcularEvolucao();

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor || 0);
  };

  const getCategoriasDisponiveis = (currentType) => {
    return categorias.filter(c =>
      c.tipo === currentType || c.tipo === "Ambos"
    );
  };

  const getCentroCustoNome = (id) => {
    const cc = centrosCusto.find(c => c.id === id);
    return cc ? cc.nome : null;
  };

  const getCentroCustoColor = (id) => {
    const cc = centrosCusto.find(c => c.id === id);
    return cc ? cc.cor : "#9ca3af";
  };

  const abrirDetalhes = (titulo, lista, tipo) => {
    // Sort for consistency, ensuring Date objects are consistently parsed for comparison
    setTituloDetalhes(titulo);
    setLancamentosDetalhados(lista.sort((a, b) => {
      const dateA = createDateFromBrasiliaString(a.data_lancamento || (a.created_date ? format(parseISO(a.created_date), 'yyyy-MM-dd') : null));
      const dateB = createDateFromBrasiliaString(b.data_lancamento || (b.created_date ? format(parseISO(b.created_date), 'yyyy-MM-dd') : null));

      if (!dateA || isNaN(dateA.getTime())) return 1;
      if (!dateB || isNaN(dateB.getTime())) return -1;
      
      return dateB.getTime() - dateA.getTime();
    }));
    setTipoDetalhes(tipo);
    setDialogDetalhes(true);
  };

  const exportarPDF = () => {
    alert("Funcionalidade de exportação PDF em desenvolvimento");
  };

  const notificacoesPendentes = lancamentos.filter(l => {
    if (l.status_pagamento !== "Pendente" || !l.data_vencimento || l.servico_id) return false; // Exclude service-linked
    // Use the consistent Brasilia timezone parsing for comparison
    const dataVenc = createDateFromBrasiliaString(l.data_vencimento);
    const hojeBrasiliaStartOfDay = createDateFromBrasiliaString(getTodayBrasilia());
    return dataVenc && !isNaN(dataVenc.getTime()) && hojeBrasiliaStartOfDay && !isNaN(hojeBrasiliaStartOfDay.getTime()) && dataVenc <= hojeBrasiliaStartOfDay; // Is due today or in the past
  }).length + servicos.filter(s => { // Add pending services
    if (s.status_pagamento !== "Pendente" || !s.data_vencimento) return false;
    const dataVenc = createDateFromBrasiliaString(s.data_vencimento);
    const hojeBrasiliaStartOfDay = createDateFromBrasiliaString(getTodayBrasilia());
    return dataVenc && !isNaN(dataVenc.getTime()) && hojeBrasiliaStartOfDay && !isNaN(hojeBrasiliaStartOfDay.getTime()) && dataVenc <= hojeBrasiliaStartOfDay;
  }).length;


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-4xl font-bold text-white flex items-center gap-3">
            <DollarSign className="w-10 h-10 text-green-500" />
            Financeiro
          </h2>
          <p className="text-gray-400 mt-2">Gestão completa de receitas e despesas</p>
        </div>
        <div className="flex gap-3">
          {notificacoesPendentes > 0 && (
            <Button
              variant="outline"
              onClick={() => setDialogNotificacao(true)}
              className="relative border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              <Bell className="w-5 h-5" />
              <Badge className="absolute -top-2 -right-2 bg-red-500 text-white h-5 w-5 p-0 flex items-center justify-center text-xs">
                {notificacoesPendentes}
              </Badge>
            </Button>
          )}

          <Button
            onClick={() => setDialogCentroCusto(true)}
            className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg"
          >
            <FolderOpen className="w-5 h-5 mr-2" />
            Centros de Custo
          </Button>
          <Button
            onClick={() => setDialogAberto(true)}
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-green-500/50"
          >
            <Plus className="w-5 h-5 mr-2" />
            Novo Lançamento
          </Button>
        </div>
      </div>

      {/* ✅ Primeira Linha - Balões Principais Sincronizados */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Despesas Pagas */}
        <Card className="border-2 border-red-500/30 bg-gradient-to-br from-red-500/10 to-pink-500/10 hover:shadow-lg hover:shadow-red-500/20 transition-all">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-500" />
              Despesas Pagas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-400">{formatarMoeda(totalDespesasPagas)}</div>
            <p className="text-xs text-gray-500 mt-1">
              {despesasPagasLancamentos.length > 0 ? `${despesasPagasLancamentos.length} pagas no período` : 'Nenhuma despesa paga'}
            </p>
          </CardContent>
        </Card>

        {/* Receitas Recebidas */}
        <Card className="border-2 border-green-500/30 bg-gradient-to-br from-green-500/10 to-emerald-500/10 hover:shadow-lg hover:shadow-green-500/20 transition-all">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              Receitas Recebidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-400">{formatarMoeda(totalReceitasRecebidas)}</div>
            <p className="text-xs text-gray-500 mt-1">
              {qtdReceitasRecebidas > 0 ? (
                `${receitasRecebidasLancamentos.length} lançamentos + ${receitasRecebidasServicos.length} serviços`
              ) : (
                'Nenhuma receita recebida no período'
              )}
            </p>
          </CardContent>
        </Card>

        {/* Saldo Atual */}
        <Card className="border-2 border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 hover:shadow-lg hover:shadow-cyan-500/20 transition-all">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-cyan-500" />
              Saldo Atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${saldoAtual >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
              {formatarMoeda(saldoAtual)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Receitas - Despesas (incluindo serviços)</p>
          </CardContent>
        </Card>
      </div>

      {/* ✅ Segunda Linha - Contas Pendentes Sincronizadas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Contas a Pagar */}
        <Card 
          className="border-2 border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-amber-500/10 hover:shadow-lg hover:shadow-yellow-500/20 transition-all cursor-pointer group"
          onClick={() => abrirDetalhes("Contas a Pagar (Pendentes)", contasPagarLancamentos, "pagar")}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium text-gray-300 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-500 group-hover:animate-pulse" />
              Contas a Pagar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-4xl font-bold text-yellow-400">{formatarMoeda(totalContasPagar)}</div>
                <p className="text-sm text-gray-500 mt-1">
                  {qtdContasPagar > 0 ? `${qtdContasPagar} despesas pendentes` : 'Nenhuma despesa pendente'}
                </p>
              </div>
              {proximoVencimentoPagar && (
                <div className="text-right">
                  <p className="text-xs text-gray-500">Próximo vencimento</p>
                  <Badge variant="outline" className="border-yellow-500/30 text-yellow-400 mt-1">
                    {formatarDataSegura(proximoVencimentoPagar.data_vencimento)}
                  </Badge>
                </div>
              )}
            </div>
            
            {qtdContasPagar > 0 && (
              <div className="pt-3 border-t border-yellow-500/20">
                <p className="text-xs text-gray-500 mb-2">Últimas pendências</p>
                <div className="flex items-end gap-1 h-12">
                  {contasPagarLancamentos.slice(0, 7).map((_, idx) => (
                    <div 
                      key={idx} 
                      className="flex-1 bg-yellow-500/30 rounded-t"
                      style={{ height: `${Math.random() * 100}%` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contas a Receber */}
        <Card 
          className="border-2 border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 hover:shadow-lg hover:shadow-blue-500/20 transition-all cursor-pointer group"
          onClick={() => abrirDetalhes("Contas a Receber (Pendentes)", todasContasReceber, "receber")}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium text-gray-300 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500 group-hover:animate-spin" />
              Contas a Receber
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-4xl font-bold text-blue-400">{formatarMoeda(totalContasReceber)}</div>
                <p className="text-sm text-gray-500 mt-1">
                  {qtdContasReceber > 0 ? (
                    `${contasReceberLancamentos.length} lançamentos + ${contasReceberServicos.length} serviços pendentes`
                  ) : (
                    'Nenhuma receita pendente'
                  )}
                </p>
              </div>
              {proximoVencimentoReceber && (
                <div className="text-right">
                  <p className="text-xs text-gray-500">Próximo vencimento</p>
                  <Badge variant="outline" className="border-blue-500/30 text-blue-400 mt-1">
                    {formatarDataSegura(proximoVencimentoReceber.data_vencimento)}
                  </Badge>
                </div>
              )}
            </div>
            
            {qtdContasReceber > 0 && (
              <div className="pt-3 border-t border-blue-500/20">
                <p className="text-xs text-gray-500 mb-2">Últimas pendências</p>
                <div className="flex items-end gap-1 h-12">
                  {todasContasReceber.slice(0, 7).map((_, idx) => (
                    <div 
                      key={idx} 
                      className="flex-1 bg-blue-500/30 rounded-t"
                      style={{ height: `${Math.random() * 100}%` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Seção de Evolução - Updated with Metric Selector */}
      <Card className="border-2 border-green-500/20 bg-gray-800/50 backdrop-blur shadow-xl">
        <CardHeader className="border-b border-green-500/20 bg-gray-800/30">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <CardTitle className="text-white">Evolução Financeira</CardTitle>
            <div className="flex gap-3">
              <Select value={metricaGrafico} onValueChange={setMetricaGrafico}>
                <SelectTrigger className="w-48 bg-gray-700 border-green-500/30 text-white">
                  <SelectValue placeholder="Métrica do Gráfico" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-green-500/30">
                  <SelectItem value="receitas_despesas">Receitas x Despesas</SelectItem>
                  <SelectItem value="lucro">Lucro Líquido</SelectItem>
                  <SelectItem value="pagas_pendentes">Pendentes (Receitas/Despesas)</SelectItem>
                </SelectContent>
              </Select>

              <Select value={periodoEvolucao} onValueChange={setPeriodoEvolucao}>
                <SelectTrigger className="w-32 bg-gray-700 border-green-500/30 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-green-500/30">
                  <SelectItem value="Diário">Diário</SelectItem>
                  <SelectItem value="Semanal">Semanal</SelectItem>
                  <SelectItem value="Mensal">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <ResponsiveContainer width="100%" height={350}>
            {metricaGrafico === "receitas_despesas" ? (
              <LineChart data={dadosEvolucao}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="periodo" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-gray-800 border border-green-500 p-3 rounded-lg">
                          <p className="text-white font-semibold">{payload[0].payload.periodo}</p>
                          <p className="text-green-400">Receitas: {formatarMoeda(payload[0].payload.receitas)}</p>
                          <p className="text-red-400">Despesas: {formatarMoeda(payload[0].payload.despesas)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="receitas" stroke="#10b981" strokeWidth={2} dot={{ fill: "#10b981" }} name="Receitas" />
                <Line type="monotone" dataKey="despesas" stroke="#ef4444" strokeWidth={2} dot={{ fill: "#ef4444" }} name="Despesas" />
              </LineChart>
            ) : metricaGrafico === "lucro" ? (
              <AreaChart data={dadosEvolucao}>
                <defs>
                  <linearGradient id="colorLucro" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00ffc6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#00ffc6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="periodo" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-gray-800 border border-green-500 p-3 rounded-lg">
                          <p className="text-white font-semibold">{payload[0].payload.periodo}</p>
                          <p className="text-cyan-400">Lucro: {formatarMoeda(payload[0].payload.lucro)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="lucro" stroke="#00ffc6" fillOpacity={1} fill="url(#colorLucro)" name="Lucro Líquido" />
              </AreaChart>
            ) : ( // metricaGrafico === "pagas_pendentes"
              <LineChart data={dadosEvolucao}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="periodo" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-gray-800 border border-green-500 p-3 rounded-lg">
                          <p className="text-white font-semibold">{payload[0].payload.periodo}</p>
                          <p className="text-blue-400">Receitas Pendentes: {formatarMoeda(payload[0].payload.receitasPendentes)}</p>
                          <p className="text-yellow-400">Despesas Pendentes: {formatarMoeda(payload[0].payload.despesasPendentes)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="receitasPendentes" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6" }} name="Receitas Pendentes" />
                <Line type="monotone" dataKey="despesasPendentes" stroke="#eab308" strokeWidth={2} dot={{ fill: "#eab308" }} name="Despesas Pendentes" />
              </LineChart>
            )}
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Listagem de Lançamentos com Serviços Agrupados */}
      <Card className="border-2 border-green-500/20 bg-gray-800/50 backdrop-blur shadow-xl">
        <CardHeader className="border-b border-green-500/20 bg-gray-800/30">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5 text-green-500" />
              <Input
                placeholder="Buscar por descrição ou categoria..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="flex-1 border-none bg-transparent focus-visible:ring-0 text-white placeholder:text-gray-500"
              />
              <Filter className="w-5 h-5 text-green-500" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-gray-400">Data Início</Label>
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="bg-gray-700 border-green-500/30 text-white"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-400">Data Fim</Label>
                <Input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="bg-gray-700 border-green-500/30 text-white"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-400">Tipo</Label>
                <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
                  <SelectTrigger className="bg-gray-700 border-green-500/30 text-white">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-green-500/30">
                    <SelectItem value={null}>Todos</SelectItem>
                    <SelectItem value="Receita">Receita</SelectItem>
                    <SelectItem value="Despesa">Despesa</SelectItem>
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
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Pago">Pago</SelectItem>
                    <SelectItem value="Recebido">Recebido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-400">Centro de Custo</Label>
                <Select value={centroCustoFiltro} onValueChange={setCentroCustoFiltro}>
                  <SelectTrigger className="bg-gray-700 border-green-500/30 text-white">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-green-500/30">
                    <SelectItem value={null}>Nenhum</SelectItem>
                    {centrosCusto.filter(cc => cc.ativo).map(cc => (
                      <SelectItem key={cc.id} value={cc.id}>{cc.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="divide-y divide-gray-700">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
              </div>
            ) : (
              <>
                {/* NOVO: Agrupamento de Serviços Expansível */}
                <Card className="border-2 border-green-500/20 bg-gray-800/50 backdrop-blur shadow-xl overflow-hidden rounded-t-none">
                  <CardContent className="p-0">
                    {/* Header Expansível */}
                    <button
                      onClick={() => setServicosExpandido(!servicosExpandido)}
                      className="w-full p-6 flex items-center justify-between hover:bg-gray-700/30 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                          <FileText className="w-7 h-7 text-white" />
                        </div>
                        <div className="text-left">
                          <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            Lançamentos de Serviços
                            {servicosFinanceiro.length > 0 && (
                              <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                                {servicosFinanceiro.length} lançamentos
                              </Badge>
                            )}
                          </h3>
                          <p className="text-sm text-gray-400 mt-1">
                            Total consolidado dos serviços realizados
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Clique para ver detalhes de todos os {servicosFinanceiro.length} lançamentos
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-3xl font-bold text-green-400">
                            {formatarMoeda(servicosFinanceiro.reduce((sum, s) => sum + (s.valor_total || 0), 0))}
                          </p>
                          {servicosFinanceiro.length > 0 && (
                            <div className="flex gap-2 mt-2 justify-end">
                              <Badge variant="outline" className="text-xs border-yellow-500/30 text-yellow-300">
                                {servicosFinanceiro.filter(s => s.status_pagamento === "Pendente").length} pendentes
                              </Badge>
                              <Badge variant="outline" className="text-xs border-green-500/30 text-green-300">
                                {servicosFinanceiro.filter(s => s.status_pagamento === "Pago").length} pagos
                              </Badge>
                            </div>
                          )}
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-gray-700/50 flex items-center justify-center">
                          {servicosExpandido ? (
                            <ChevronUp className="w-5 h-5 text-green-500" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-green-500" />
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Lista Expansível de Serviços */}
                    {servicosExpandido && (
                      <div className="border-t border-green-500/20 bg-gray-900/30">
                        <div className="p-6 space-y-3">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-semibold text-white">Detalhamento por Serviço</h4>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setServicosExpandido(false)}
                              className="border-gray-600 text-gray-300 hover:bg-gray-700"
                            >
                              Recolher Lista
                            </Button>
                          </div>

                          {servicosFinanceiro.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                              <p>Nenhum serviço registrado no período</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {servicosFinanceiro.map((servico) => (
                                <Card
                                  key={servico.id}
                                  className="border border-gray-700 bg-gray-800/50 hover:bg-gray-800 hover:border-green-500/30 transition-all"
                                >
                                  <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                      {/* Info do Serviço */}
                                      <div className="flex items-center gap-4 flex-1">
                                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center flex-shrink-0">
                                          <span className="text-sm font-bold text-white">
                                            #{servico.numero_pedido || servico.id.slice(-4).toUpperCase()}
                                          </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 mb-1">
                                            <p className="font-semibold text-white truncate">
                                              {servico.cliente_nome_avulso || clientes.find(c => c.id === servico.cliente_id)?.nome || "Cliente"}
                                            </p>
                                            <Badge className={
                                              servico.status_pagamento === "Pago"
                                                ? "bg-green-500/20 text-green-300"
                                                : "bg-yellow-500/20 text-yellow-300"
                                            }>
                                              {servico.status_pagamento}
                                            </Badge>
                                          </div>
                                          <div className="flex items-center gap-3 text-xs text-gray-400">
                                            <span className="flex items-center gap-1">
                                              <Calendar className="w-3 h-3" />
                                              {formatDateTime(servico.created_date)}
                                            </span>
                                            {servico.prestador_nome && (
                                              <span className="flex items-center gap-1">
                                                <Truck className="w-3 h-3" />
                                                {servico.prestador_nome}
                                              </span>
                                            )}
                                            {servico.forma_pagamento && (
                                              <Badge variant="outline" className="text-xs border-gray-600 text-gray-300">
                                                {servico.forma_pagamento}
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Valor e Ações */}
                                      <div className="flex items-center gap-4">
                                        <div className="text-right">
                                          <p className="text-xl font-bold text-green-400">
                                            {formatarMoeda(servico.valor_total)}
                                          </p>
                                          <p className="text-xs text-gray-500">
                                            {servico.status_servico}
                                          </p>
                                        </div>
                                        <div className="flex gap-2">
                                          <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={(e) => {
                                              e.stopPropagation(); // Prevent toggling expansion
                                              window.location.href = createPageUrl("servicos") + `?edit=${servico.id}`;
                                            }}
                                            className="h-9 w-9 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-green-400 hover:border-green-500/50"
                                            title="Editar Serviço"
                                          >
                                            <Edit className="w-4 h-4" />
                                          </Button>
                                          <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={(e) => {
                                              e.stopPropagation(); // Prevent toggling expansion
                                              if (window.confirm(`Confirma a exclusão do serviço OS #${servico.numero_pedido}?\n\nEsta ação também excluirá todos os lançamentos financeiros vinculados a este serviço e não pode ser desfeita.`)) {
                                                excluirServicoMutation.mutate(servico.id);
                                              }
                                            }}
                                            className="h-9 w-9 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50"
                                            title="Excluir Serviço"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Listagem Normal dos Demais Lançamentos */}
                {lancamentosFiltrados.length === 0 && servicosFinanceiro.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">Nenhum lançamento manual encontrado</p>
                  </div>
                ) : (
                  lancamentosFiltrados.map((lancamento) => (
                    <div
                      key={lancamento.id}
                      className="p-4 hover:bg-gray-700/50 transition-colors cursor-pointer"
                      onClick={() => abrirEdicao(lancamento)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            lancamento.tipo === "Receita" ? "bg-green-500/20" : "bg-red-500/20"
                          }`}>
                            {lancamento.tipo === "Receita" ? (
                              <TrendingUp className="w-6 h-6 text-green-500" />
                            ) : (
                              <TrendingDown className="w-6 h-6 text-red-500" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-white">{lancamento.descricao}</h3>
                              {lancamento.recorrente && (
                                <Badge variant="outline" className="border-purple-500/30 text-purple-400 flex items-center gap-1">
                                  <Repeat className="w-3 h-3" />
                                  Recorrente
                                </Badge>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-2 text-sm text-gray-400">
                              {lancamento.categoria && (
                                <Badge variant="outline" className="border-gray-600 text-gray-300">
                                  {lancamento.categoria}
                                </Badge>
                              )}
                              {lancamento.centro_custo_id && (
                                <Badge
                                  variant="outline"
                                  style={{ borderColor: getCentroCustoColor(lancamento.centro_custo_id), color: getCentroCustoColor(lancamento.centro_custo_id) }}
                                  className="flex items-center gap-1"
                                >
                                  <FolderOpen className="w-3 h-3" />
                                  {getCentroCustoNome(lancamento.centro_custo_id)}
                                </Badge>
                              )}
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatarDataSegura(lancamento.data_lancamento)}
                              </span>
                              {lancamento.data_vencimento && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Venc: {formatarDataSegura(lancamento.data_vencimento)}
                                </span>
                              )}
                            </div>

                            {lancamento.observacoes && (
                              <p className="text-sm text-gray-500 mt-1 line-clamp-1">{lancamento.observacoes}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className={`text-2xl font-bold ${
                              lancamento.tipo === "Receita" ? "text-green-400" : "text-red-400"
                            }`}>
                              {formatarMoeda(lancamento.valor)}
                            </div>
                            <Badge className={
                              lancamento.status_pagamento === "Pendente"
                                ? "bg-gray-500/20 text-gray-300"
                                : lancamento.status_pagamento === "Pago" || lancamento.status_pagamento === "Recebido"
                                ? "bg-green-500/20 text-green-300"
                                : "bg-gray-500/20 text-gray-300"
                            }>
                              {lancamento.status_pagamento}
                            </Badge>
                          </div>

                          <div className="flex flex-col gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => handleMarcarPago(e, lancamento)}
                              className={
                                lancamento.status_pagamento === "Pago" || lancamento.status_pagamento === "Recebido"
                                  ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                                  : "border-green-500/30 text-green-400 hover:bg-green-500/10"
                              }
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              {lancamento.status_pagamento === "Pago" || lancamento.status_pagamento === "Recebido" ? "Pendente" : "Pagar"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); abrirEdicao(lancamento); }}
                              className="border-gray-600 text-gray-300 hover:bg-gray-700"
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              Editar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => handleExcluir(e, lancamento)}
                              className="text-red-400 hover:text-red-500 hover:bg-red-500/10 border-red-500/30"
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Excluir
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Informações de Criação e Alteração */}
                      <div className="mt-3 pt-3 border-t border-gray-700 flex items-center justify-between text-[10px] text-gray-500">
                        <div className="flex items-center gap-4 flex-wrap">
                          {lancamento.criado_por_nome && (
                            <span>
                              Criado por: <span className="text-gray-400">{lancamento.criado_por_nome}</span>
                              {lancamento.created_date && (
                                <> • {formatarDataSegura(lancamento.created_date, "dd/MM/yyyy 'às' HH:mm")}</>
                              )}
                            </span>
                          )}
                          {lancamento.alterado_por_nome && (
                            <span>
                              Alterado por: <span className="text-gray-400">{lancamento.alterado_por_nome}</span>
                              {lancamento.data_alteracao && (
                                <> • {formatarDataSegura(lancamento.data_alteracao, "dd/MM/yyyy 'às' HH:mm")}</>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog Detalhes */}
      <Dialog open={dialogDetalhes} onOpenChange={setDialogDetalhes}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-gray-800 border-2 border-green-500/30">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center justify-between">
              <span>{tituloDetalhes}</span>
              <Button onClick={exportarPDF} size="sm" variant="outline" className="border-green-500/30 text-green-400 hover:bg-green-500/10">
                <Download className="w-4 h-4 mr-1" />
                PDF
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3">
            {lancamentosDetalhados.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Nenhum lançamento encontrado</p>
            ) : (
              lancamentosDetalhados.map((item) => ( // 'item' can be a Lancamento or Servico
                <Card key={item.id} className="border border-green-500/20 bg-gray-700/30">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-bold text-white text-lg">
                          {item.descricao || `Serviço OS #${item.numero_pedido || item.id.slice(-4).toUpperCase()}`}
                        </h4>
                        <div className="flex flex-wrap gap-2 mt-2 text-sm text-gray-400">
                          {item.categoria && <Badge variant="outline">{item.categoria}</Badge>}
                          {item.status_servico && <Badge variant="outline">{item.status_servico}</Badge>}
                          <span>Data: {formatarDataSegura(item.data_lancamento || (item.created_date ? format(parseISO(item.created_date), 'yyyy-MM-dd') : null))}</span>
                          {item.data_vencimento && <span>Venc: {formatarDataSegura(item.data_vencimento)}</span>}
                        </div>
                        {item.observacoes && <p className="text-sm text-gray-500 mt-2">{item.observacoes}</p>}
                        {item.prestador_nome && <p className="text-sm text-gray-500 mt-2">Prestador: {item.prestador_nome}</p>}
                        {item.cliente_nome_avulso && <p className="text-sm text-gray-500 mt-2">Cliente: {item.cliente_nome_avulso}</p>}
                      </div>
                      <div className="text-right flex flex-col items-end gap-2">
                        <div className={`text-2xl font-bold ${
                          item.tipo === "Receita" || item.tipo_servico === "Receita" ? "text-green-400" : "text-red-400"
                        }`}>
                          {formatarMoeda(item.valor || item.valor_total)}
                        </div>
                        <Badge className={item.status_pagamento === "Pendente" ? "bg-yellow-500/20 text-yellow-300" : "bg-green-500/20 text-green-300"}>
                          {item.status_pagamento}
                        </Badge>
                        {item.status_pagamento === "Pendente" && (
                          <Button
                            onClick={() => handleMarcarPagoDetalhes(item)}
                            size="sm"
                            className={tipoDetalhes === "pagar" ? "bg-yellow-500 hover:bg-yellow-600" : "bg-blue-500 hover:bg-blue-600"}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            {item.tipo === "Despesa" || item.tipo_servico === "Despesa" ? "Marcar como Pago" : "Marcar como Recebido"}
                          </Button>
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

      {/* Dialog Notificação de Vencimentos */}
      <Dialog open={dialogNotificacao} onOpenChange={setDialogNotificacao}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-red-900/20 to-gray-800 border-2 border-red-500/30">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Bell className="w-6 h-6 text-red-500 animate-pulse" />
              Vencimentos Pendentes
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDialogNotificacao(false)}
                className="ml-auto text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {lancamentosVencidos.length === 0 ? (
              <p className="text-center text-gray-400 py-8">✅ Nenhum vencimento pendente</p>
            ) : (
              <>
                <p className="text-sm text-gray-300 mb-4">
                  Você tem {lancamentosVencidos.length} lançamento(s) vencido(s) ou vencendo hoje que precisa(m) de atenção:
                </p>
                {lancamentosVencidos.map((item) => ( // 'item' can be a Lancamento or Servico
                  <Card key={item.id} className="border border-red-500/30 bg-red-500/5">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-bold text-white text-lg">
                            {item.descricao || `Serviço OS #${item.numero_pedido || item.id.slice(-4).toUpperCase()}`}
                          </h4>
                          <div className="flex flex-wrap gap-2 mt-2 text-sm">
                            {(item.categoria || item.status_servico) && <Badge variant="outline" className="border-red-500/30 text-red-400">{item.categoria || item.status_servico}</Badge>}
                            <Badge className="bg-red-500/20 text-red-300">
                              Vencimento: {formatarDataSegura(item.data_vencimento)}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-2">
                          <div className={`text-2xl font-bold ${item.tipo === "Receita" || item.tipo_servico === "Receita" ? "text-green-400" : "text-yellow-400"}`}>
                            {formatarMoeda(item.valor || item.valor_total)}
                          </div>
                          <Button
                            onClick={() => {
                              handleMarcarPagoDetalhes(item);
                              setLancamentosVencidos(prev => prev.filter(l => l.id !== item.id));
                            }}
                            size="sm"
                            className={item.tipo === "Receita" || item.tipo_servico === "Receita" ? "bg-green-500 hover:bg-green-600" : "bg-yellow-500 hover:bg-yellow-600"}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            {item.tipo === "Receita" || item.tipo_servico === "Receita" ? "Receber" : "Pagar"}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>


      {/* Dialog Novo Lançamento */}
      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-gray-800 border-2 border-green-500/30">
          <DialogHeader>
            <DialogTitle className="text-white">Novo Lançamento</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Tipo *</Label>
                <Select value={formData.tipo} onValueChange={(value) => setFormData({...formData, tipo: value, categoria: ""})}>
                  <SelectTrigger className="bg-gray-700 border-green-500/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-green-500/30">
                    <SelectItem value="Receita">Receita</SelectItem>
                    <SelectItem value="Despesa">Despesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Valor (R$) *</Label>
                <CurrencyInput
                  required
                  value={formData.valor}
                  onValueChange={(value) => setFormData({...formData, valor: value})}
                  className="bg-gray-700 border-green-500/30 text-white"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-gray-300">Descrição * (digite ou selecione cliente/prestador)</Label>
                <AutocompleteDescricao
                  value={formData.descricao}
                  onChange={handleAutocompleteChange}
                  clientes={clientes}
                  prestadores={prestadores}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Categoria</Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.categoria}
                    onValueChange={(value) => setFormData({...formData, categoria: value})}
                    className="flex-1"
                  >
                    <SelectTrigger className="bg-gray-700 border-green-500/30 text-white">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-green-500/30">
                      <SelectItem value={null}>Nenhuma</SelectItem>
                      {getCategoriasDisponiveis(formData.tipo).map(c => (
                        <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setDialogCategoria(true)}
                    className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Centro de Custo</Label>
                <Select
                  value={formData.centro_custo_id}
                  onValueChange={(value) => setFormData({...formData, centro_custo_id: value})}
                >
                  <SelectTrigger className="bg-gray-700 border-green-500/30 text-white">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-green-500/30">
                    <SelectItem value={null}>Nenhum</SelectItem>
                    {centrosCusto.filter(cc => cc.ativo).map(cc => (
                      <SelectItem key={cc.id} value={cc.id}>{cc.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Data do Lançamento *</Label>
                <Input
                  type="date"
                  required
                  value={formData.data_lancamento}
                  onChange={(e) => setFormData({...formData, data_lancamento: e.target.value})}
                  className="bg-gray-700 border-green-500/30 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Data de Vencimento</Label>
                <Input
                  type="date"
                  value={formData.data_vencimento}
                  onChange={(e) => setFormData({...formData, data_vencimento: e.target.value})}
                  className="bg-gray-700 border-green-500/30 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Status *</Label>
                <Select value={formData.status_pagamento} onValueChange={(value) => setFormData({...formData, status_pagamento: value})}>
                  <SelectTrigger className="bg-gray-700 border-green-500/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-green-500/30">
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Pago">Pago</SelectItem>
                    <SelectItem value="Recebido">Recebido</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center space-x-2 p-3 bg-gray-700/30 rounded-lg border border-green-500/20">
                  <Checkbox
                    id="incluir_financeiro_geral"
                    checked={formData.incluir_financeiro_geral}
                    onCheckedChange={(checked) => setFormData({...formData, incluir_financeiro_geral: checked})}
                  />
                  <label htmlFor="incluir_financeiro_geral" className="text-sm font-medium text-gray-300 cursor-pointer flex-1">
                    <div>Incluir no Financeiro Geral</div>
                    <p className="text-xs text-gray-500 mt-1">
                      Quando desmarcado, o lançamento não afetará o financeiro geral da empresa
                      {formData.prestador_id && " e será incluído apenas no caixa do prestador selecionado"}
                    </p>
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="recorrente"
                    checked={formData.recorrente}
                    onCheckedChange={(checked) => setFormData({...formData, recorrente: checked})}
                  />
                  <label htmlFor="recorrente" className="text-sm font-medium text-gray-300 cursor-pointer">
                    Lançamento Recorrente
                  </label>
                </div>
              </div>
            </div>

            {formData.recorrente && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-700/30 rounded-lg border border-gray-600">
                <div className="space-y-2">
                  <Label className="text-gray-300">Periodicidade</Label>
                  <Select value={formData.periodicidade} onValueChange={(value) => setFormData({...formData, periodicidade: value})}>
                    <SelectTrigger className="bg-gray-700 border-green-500/30 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-green-500/30">
                      <SelectItem value="Mensal">Mensal</SelectItem>
                      <SelectItem value="Semanal">Semanal</SelectItem>
                      <SelectItem value="Diário">Diário</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Número de Parcelas</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.parcelas}
                    onChange={(e) => setFormData({...formData, parcelas: parseInt(e.target.value)})}
                    className="bg-gray-700 border-green-500/30 text-white"
                  />
                  <p className="text-xs text-gray-500">0 = Infinito (parcelas serão geradas como 1)</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-gray-300">Observações</Label>
              <Textarea
                value={formData.observacoes}
                onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                rows={3}
                className="bg-gray-700 border-green-500/30 text-white"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogAberto(false)} className="border-gray-600 text-gray-300 hover:bg-gray-700">
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                disabled={createMutation.isPending}
              >
                Criar Lançamento
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Adicionar Categoria */}
      <Dialog open={dialogCategoria} onOpenChange={setDialogCategoria}>
        <DialogContent className="bg-gray-800 border-2 border-green-500/30">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Tag className="w-5 h-5 text-green-500" />
              Nova Categoria
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitCategoria} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Nome *</Label>
              <Input
                required
                value={novaCategoria.nome}
                onChange={(e) => setNovaCategoria({...novaCategoria, nome: e.target.value})}
                className="bg-gray-700 border-green-500/30 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Tipo *</Label>
              <Select value={novaCategoria.tipo} onValueChange={(value) => setNovaCategoria({...novaCategoria, tipo: value})}>
                <SelectTrigger className="bg-gray-700 border-green-500/30 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-green-500/30">
                  <SelectItem value="Receita">Receita</SelectItem>
                  <SelectItem value="Despesa">Despesa</SelectItem>
                  <SelectItem value="Ambos">Ambos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Descrição</Label>
              <Textarea
                value={novaCategoria.descricao}
                onChange={(e) => setNovaCategoria({...novaCategoria, descricao: e.target.value})}
                rows={2}
                className="bg-gray-700 border-green-500/30 text-white"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setDialogCategoria(false)} className="border-gray-600 text-gray-300">
                Cancelar
              </Button>
              <Button type="submit" className="bg-gradient-to-r from-green-500 to-emerald-600" disabled={createCategoriaMutation.isPending}>
                Criar Categoria
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Centros de Custo */}
      <Dialog open={dialogCentroCusto} onOpenChange={setDialogCentroCusto}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-800 border-2 border-purple-500/30">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-purple-500" />
              Gerenciar Centros de Custo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <form onSubmit={handleSubmitCentroCusto} className="p-4 bg-gray-700/30 rounded-lg border border-purple-500/20">
              <h3 className="text-white font-semibold mb-3">Novo Centro de Custo</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">Nome *</Label>
                  <Input
                    required
                    value={novoCentroCusto.nome}
                    onChange={(e) => setNovoCentroCusto({...novoCentroCusto, nome: e.target.value})}
                    className="bg-gray-700 border-purple-500/30 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Cor</Label>
                  <Input
                    type="color"
                    value={novoCentroCusto.cor}
                    onChange={(e) => setNovoCentroCusto({...novoCentroCusto, cor: e.target.value})}
                    className="bg-gray-700 border-purple-500/30 h-10 w-full p-0"
                  />
                </div>
                <div className="flex items-end">
                  <Button type="submit" className="w-full bg-gradient-to-r from-purple-500 to-purple-600" disabled={createCentroCustoMutation.isPending}>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar
                  </Button>
                </div>
                <div className="space-y-2 md:col-span-3">
                  <Label className="text-gray-300">Descrição</Label>
                  <Textarea
                    value={novoCentroCusto.descricao}
                    onChange={(e) => setNovoCentroCusto({...novoCentroCusto, descricao: e.target.value})}
                    rows={2}
                    className="bg-gray-700 border-purple-500/30 text-white"
                  />
                </div>
              </div>
            </form>

            <div className="space-y-2">
              <h3 className="text-white font-semibold">Centros de Custo Cadastrados</h3>
              {centrosCusto.length === 0 ? (
                <p className="text-gray-400 text-center py-8">Nenhum centro de custo cadastrado</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {centrosCusto.map(cc => (
                    <div key={cc.id} className="p-4 bg-gray-700/50 rounded-lg border border-purple-500/20 flex items-center gap-3">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: cc.cor }} />
                      <div className="flex-1">
                        <p className="font-medium text-white">{cc.nome}</p>
                        {cc.descricao && <p className="text-sm text-gray-400">{cc.descricao}</p>}
                      </div>
                      <Badge className={cc.ativo ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}>
                        {cc.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Edição */}
      <Dialog open={dialogEdicao} onOpenChange={setDialogEdicao}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-800 border-2 border-green-500/30">
          <DialogHeader>
            <DialogTitle className="text-white">Editar Lançamento</DialogTitle>
          </DialogHeader>

          {lancamentoSelecionado && (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">Tipo *</Label>
                  <Select
                    value={lancamentoSelecionado.tipo}
                    onValueChange={(value) => setLancamentoSelecionado({...lancamentoSelecionado, tipo: value, categoria: ""})}
                  >
                    <SelectTrigger className="bg-gray-700 border-green-500/30 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-green-500/30">
                      <SelectItem value="Receita">Receita</SelectItem>
                      <SelectItem value="Despesa">Despesa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Valor (R$) *</Label>
                  <CurrencyInput
                    required
                    value={lancamentoSelecionado.valor}
                    onValueChange={(value) => setLancamentoSelecionado({...lancamentoSelecionado, valor: value})}
                    className="bg-gray-700 border-green-500/30 text-white"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-gray-300">Descrição *</Label>
                  <Input
                    required
                    value={lancamentoSelecionado.descricao}
                    onChange={(e) => setLancamentoSelecionado({...lancamentoSelecionado, descricao: e.target.value})}
                    className="bg-gray-700 border-green-500/30 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Categoria</Label>
                  <Select
                    value={lancamentoSelecionado.categoria || ""}
                    onValueChange={(value) => setLancamentoSelecionado({...lancamentoSelecionado, categoria: value})}
                  >
                    <SelectTrigger className="bg-gray-700 border-green-500/30 text-white">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-green-500/30">
                      <SelectItem value={null}>Nenhuma</SelectItem>
                      {getCategoriasDisponiveis(lancamentoSelecionado.tipo).map(c => (
                        <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Centro de Custo</Label>
                  <Select
                    value={lancamentoSelecionado.centro_custo_id || ""}
                    onValueChange={(value) => setLancamentoSelecionado({...lancamentoSelecionado, centro_custo_id: value})}
                  >
                    <SelectTrigger className="bg-gray-700 border-green-500/30 text-white">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-green-500/30">
                      <SelectItem value={null}>Nenhum</SelectItem>
                      {centrosCusto.filter(cc => cc.ativo).map(cc => (
                        <SelectItem key={cc.id} value={cc.id}>{cc.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Data do Lançamento *</Label>
                  <Input
                    type="date"
                    required
                    value={lancamentoSelecionado.data_lancamento}
                    onChange={(e) => setLancamentoSelecionado({...lancamentoSelecionado, data_lancamento: e.target.value})}
                    className="bg-gray-700 border-green-500/30 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Data de Vencimento</Label>
                  <Input
                    type="date"
                    value={lancamentoSelecionado.data_vencimento || ""}
                    onChange={(e) => setLancamentoSelecionado({...lancamentoSelecionado, data_vencimento: e.target.value})}
                    className="bg-gray-700 border-green-500/30 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Status *</Label>
                  <Select
                    value={lancamentoSelecionado.status_pagamento}
                    onValueChange={(value) => setLancamentoSelecionado({...lancamentoSelecionado, status_pagamento: value})}
                  >
                    <SelectTrigger className="bg-gray-700 border-green-500/30 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-green-500/30">
                      <SelectItem value="Pendente">Pendente</SelectItem>
                      <SelectItem value="Pago">Pago</SelectItem>
                      <SelectItem value="Recebido">Recebido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="incluir_financeiro_geral_edit"
                      checked={lancamentoSelecionado.incluir_financeiro_geral !== false}
                      onCheckedChange={(checked) => setLancamentoSelecionado({...lancamentoSelecionado, incluir_financeiro_geral: checked})}
                    />
                    <label htmlFor="incluir_financeiro_geral_edit" className="text-sm font-medium text-gray-300 cursor-pointer">
                      Incluir no Financeiro Geral
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Observações</Label>
                <Textarea
                  value={lancamentoSelecionado.observacoes || ""}
                  onChange={(e) => setLancamentoSelecionado({...lancamentoSelecionado, observacoes: e.target.value})}
                  rows={3}
                  className="bg-gray-700 border-green-500/30 text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogEdicao(false)} className="border-gray-600 text-gray-300 hover:bg-gray-700">
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                  disabled={updateMutation.isPending}
                >
                  Salvar Alterações
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
