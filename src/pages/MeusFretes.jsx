
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Calendar as CalendarIcon, Eye, Search, DollarSign, Clock, Package, CheckCircle, XCircle, AlertTriangle, Plus, Edit, CheckCircle2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDateTime, formatDateTimeFull, getRelativeTime, fromInputDateTimeToISO } from "@/components/utils/dateUtils";
import ServicoDialog from "../components/servicos/ServicoDialog";
import EditarServicoDialog from "@/components/servicos/EditarServicoDialog"; // Added import

export default function MeusFretes() {
  const [user, setUser] = useState(null);
  const [dialogDetalhes, setDialogDetalhes] = useState(false);
  const [dialogEdicao, setDialogEdicao] = useState(false); // Added for editing
  const [dialogNovoServico, setDialogNovoServico] = useState(false);
  const [dialogRecusa, setDialogRecusa] = useState(false);
  const [dialogNotificacao, setDialogNotificacao] = useState(false);
  const [dialogAgendamento30Min, setDialogAgendamento30Min] = useState(false); // Added for 30-min reminder
  const [servicoNotificacao, setServicoNotificacao] = useState(null);
  const [servicoAgendamento30Min, setServicoAgendamento30Min] = useState(null); // Added for 30-min reminder service
  const [naoMostrarMais, setNaoMostrarMais] = useState(false);
  const [servicoSelecionado, setServicoSelecionado] = useState(null);
  const [motivoRecusa, setMotivoRecusa] = useState("");
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos"); // Changed initial value
  const [ultimosServicosVerificados, setUltimosServicosVerificados] = useState([]);
  const [agendamentosNotificados, setAgendamentosNotificados] = useState([]); // Added for tracking notified appointments

  const queryClient = useQueryClient();

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

  const { data: servicos = [], isLoading } = useQuery({
    queryKey: ['servicos'],
    queryFn: async () => {
      try {
        return await base44.entities.Servico.list('-created_date');
      } catch (error) {
        console.error("Erro ao carregar serviços:", error);
        return [];
      }
    },
    enabled: !!user,
    refetchInterval: 5000
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: async () => {
      try {
        return await base44.entities.Cliente.list();
      } catch (error) {
        console.error("Erro ao carregar clientes:", error);
        return [];
      }
    },
    refetchInterval: 10000 // ✅ Atualização automática
  });

  const { data: prestadores = [] } = useQuery({ // Added useQuery for prestadores
    queryKey: ['prestadores'],
    queryFn: async () => {
      try {
        return await base44.entities.Prestador.list();
      } catch (error) {
        console.error("Erro ao carregar prestadores:", error);
        return [];
      }
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, motivo }) => {
      try {
        // ✅ USAR HORÁRIO LOCAL DO DISPOSITIVO
        const agora = new Date().toISOString();

        const servicoToUpdate = servicos.find(s => s.id === id);
        if (!servicoToUpdate) {
          throw new Error("Serviço não encontrado para atualização de status.");
        }
        const updateData = { ...servicoToUpdate, status_servico: status };
        // The motive for refusal will be handled by recusarMutation, this is a fallback or for other statuses.
        if (motivo) {
          updateData.motivo_recusa = motivo;
        }
        // Add audit fields for any status update
        updateData.alterado_por_id = user.id;
        updateData.alterado_por_nome = user.full_name || user.username;
        updateData.alterado_por_email = user.email;
        updateData.data_alteracao = agora;

        // Specific fields for "Aceito" status
        if (status === "Aceito" && !servicoToUpdate.data_aceite) { // Only set if not already set
          updateData.data_aceite = agora;
          updateData.aceito_por_id = user.id;
          updateData.aceito_por_nome = user.full_name || user.username;
        }

        // Specific fields for "Concluído" status
        if (status === "Concluído") {
          updateData.data_conclusao = agora;
        }

        return await base44.entities.Servico.update(id, updateData);
      } catch (error) {
        console.error("Erro ao atualizar status:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['servicos']);
      setDialogRecusa(false); // Only relevant if this mutation is directly triggered by recusal, which it won't be now.
      setMotivoRecusa(""); // Same as above
      setServicoSelecionado(null); // Same as above
    },
    onError: (error) => {
      console.error("Erro ao atualizar status do serviço:", error);
      alert("Erro ao atualizar status do serviço: " + error.message);
    }
  });

  const recusarMutation = useMutation({
    mutationFn: async ({ servico, motivo }) => {
      const agora = new Date().toISOString();
      
      // ✅ 1. Registrar a recusa no histórico
      try {
        await base44.entities.RecusaServico.create({
          servico_id: servico.id,
          numero_pedido: servico.numero_pedido,
          prestador_id: user.prestador_id,
          prestador_nome: user.full_name,
          cliente_nome: servico.cliente_nome_avulso || "Cliente não identificado",
          valor_servico: servico.valor_total,
          motivo_recusa: motivo,
          data_recusa: agora,
          data_servico: servico.created_date
        });
        console.log("✅ Recusa registrada no histórico");
      } catch (error) {
        console.error("❌ Erro ao registrar recusa no histórico:", error);
        // Continuar mesmo com erro no registro
      }

      // ✅ 2. Atualizar o serviço para status Recusado
      return await base44.entities.Servico.update(servico.id, {
        ...servico,
        status_servico: "Recusado",
        motivo_recusa: motivo,
        alterado_por_nome: user?.full_name || "Prestador",
        alterado_por_email: user?.email || "prestador@fr.com",
        data_alteracao: agora
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['servicos']);
      queryClient.invalidateQueries(['recusas']); // ✅ Atualizar dashboard
      setDialogRecusa(false);
      setMotivoRecusa("");
      alert("✅ Serviço recusado e registrado no histórico!");
    },
    onError: (error) => {
      alert("❌ Erro ao recusar serviço: " + error.message);
    }
  });

  // Mutation for editing a service (not just status)
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      try {
        // ✅ USAR HORÁRIO LOCAL DO DISPOSITIVO
        const agora = new Date().toISOString();

        const currentUser = await base44.auth.me();
        data.alterado_por_id = currentUser.id;
        data.alterado_por_nome = currentUser?.full_name || currentUser.username;
        data.alterado_por_email = currentUser?.email || "";
        data.data_alteracao = agora;

        // Converter data_agendamento mantendo horário local
        if (data.data_agendamento && !data.data_agendamento.includes('Z')) {
          data.data_agendamento = fromInputDateTimeToISO(data.data_agendamento);
        }

        // Recalcular comissão se prestador mudou ou valor total
        const servicoOriginal = servicos.find(s => s.id === id);
        if (data.prestador_id && data.valor_total) {
          const prestador = prestadores.find(p => p.id === data.prestador_id);
          if (prestador && (servicoOriginal.prestador_id !== data.prestador_id || servicoOriginal.valor_total !== data.valor_total)) {
            data.comissao_prestador = (data.valor_total * prestador.comissao_percentual) / 100;
          }
        }

        const servico = await base44.entities.Servico.update(id, data);
        
        // Atualizar lançamentos se valor mudou
        if (servicoOriginal && servicoOriginal.valor_total !== data.valor_total) {
          try {
            const lancamentos = await base44.entities.Lancamento.filter({ servico_id: id });
            if (lancamentos.length > 0) {
              await base44.entities.Lancamento.update(lancamentos[0].id, {
                valor: data.valor_total,
                alterado_por_id: currentUser.id,
                alterado_por_nome: currentUser?.full_name || currentUser.username,
                alterado_por_email: currentUser?.email || "",
                data_alteracao: agora,
              });
            }

            if (data.comissao_prestador) {
              const lancamentosPrest = await base44.entities.LancamentoPrestador.filter({ servico_id: id });
              if (lancamentosPrest.length > 0) {
                await base44.entities.LancamentoPrestador.update(lancamentosPrest[0].id, {
                  valor: data.comissao_prestador,
                  alterado_por_id: currentUser.id,
                  alterado_por_nome: currentUser?.full_name || currentUser.username,
                  alterado_por_email: currentUser?.email || "",
                  data_alteracao: agora,
                });
              }
            }
          } catch (error) {
            console.error("Erro ao atualizar lançamentos (ServicoDialog):", error);
          }
        }
        
        return servico;
      } catch (error) {
        console.error("Erro ao atualizar serviço:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['servicos']);
      queryClient.invalidateQueries(['lancamentos']);
      queryClient.invalidateQueries(['lancamentosprestador']);
      setDialogEdicao(false);
      setServicoSelecionado(null);
    },
    onError: (error) => {
      alert("Erro ao atualizar serviço: " + error.message);
    }
  });

  // Check if a service can be edited (24h after acceptance or admin)
  const podeEditarServico = (servico) => {
    if (!user) return false;
    
    // Admin can always edit
    if (user.tipos_usuario?.includes("Administrador")) {
      return true;
    }
    
    // Prestador can only edit their own services
    if (servico.prestador_id !== user.prestador_id) {
      return false;
    }
    
    // Service must be "Aceito" or "Coletado"
    if (!["Aceito", "Coletado"].includes(servico.status_servico)) {
      return false;
    }
    
    // Check 24h window from acceptance date
    if (servico.data_aceite) {
      const dataAceite = new Date(servico.data_aceite);
      const agora = new Date();
      const diferencaHoras = (agora.getTime() - dataAceite.getTime()) / (1000 * 60 * 60);
      
      if (diferencaHoras > 24) {
        return false;
      }
    } else {
      // If accepted but no data_aceite (shouldn't happen but defensive)
      return false;
    }
    
    return true;
  };

  const getTempoRestanteEdicao = (servico) => {
    if (!servico.data_aceite) return null;
    
    const dataAceite = new Date(servico.data_aceite);
    const agora = new Date();
    const diferencaMs = (24 * 60 * 60 * 1000) - (agora.getTime() - dataAceite.getTime());
    
    if (diferencaMs <= 0) return "Expirado";
    
    const horas = Math.floor(diferencaMs / (1000 * 60 * 60));
    const minutos = Math.floor((diferencaMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${horas}h ${minutos}min`;
  };

  const abrirEdicao = (e, servico) => {
    e.stopPropagation();
    
    if (!podeEditarServico(servico)) {
      alert("Não é possível editar este serviço. O prazo de 24 horas após o aceite expirou ou o status não permite edições.");
      return;
    }
    
    setServicoSelecionado(servico);
    setDialogEdicao(true);
  };

  const handleSalvarEdicao = (dadosEditados) => {
    if (!servicoSelecionado) return;
    
    updateMutation.mutate({
      id: servicoSelecionado.id,
      data: {
        ...servicoSelecionado,
        ...dadosEditados
      }
    });
  };

  // Existing useEffect for new service notifications
  useEffect(() => {
    if (!user?.prestador_id || !servicos.length) return;

    const servicosOcultos = JSON.parse(localStorage.getItem('servicos-ocultos') || '{}');
    const ultimaVerificacao = localStorage.getItem('ultima-verificacao-servicos');
    const agora = Date.now();

    const cincoMinutos = 5 * 60 * 1000;
    const deveMostrarNovamente = !ultimaVerificacao || (agora - parseInt(ultimaVerificacao)) > cincoMinutos;

    const servicosAguardando = servicos.filter(s =>
      s.prestador_id === user.prestador_id &&
      s.status_servico === "Aguardando Aceitação" &&
      !servicosOcultos[s.id] &&
      !(s.criado_por_email === user?.email && s.prestador_id === user?.prestador_id) // Do not notify if created by self
    );

    servicosAguardando.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());

    if (servicosAguardando.length > 0) {
      const servicoMaisRecente = servicosAguardando[0];

      const jaNotificadoRecentemente = ultimosServicosVerificados.includes(servicoMaisRecente.id);

      if (!jaNotificadoRecentemente || deveMostrarNovamente) {
        setServicoNotificacao(servicoMaisRecente);
        setDialogNotificacao(true);
        if (!ultimosServicosVerificados.includes(servicoMaisRecente.id)) {
            setUltimosServicosVerificados(prev => [...prev, servicoMaisRecente.id]);
        }
        localStorage.setItem('ultima-verificacao-servicos', agora.toString());
      }
    }
  }, [servicos, user, ultimosServicosVerificados]);

  // New useEffect for agendamento notifications (30 min before) and "Atrasado" status
  useEffect(() => {
    if (!user?.prestador_id || !servicos.length) return;

    const agora = new Date(); // Device's local time
    const agoraISO = agora.toISOString(); // Use ISO string for database updates
    
    servicos.forEach(async (servico) => {
      if (servico.prestador_id !== user.prestador_id) return;
      if (!servico.agendado || !servico.data_agendamento) return;
      
      const dataAgendamento = new Date(servico.data_agendamento);
      const diferencaMinutos = Math.floor((dataAgendamento.getTime() - agora.getTime()) / 60000);
      
      // Notificar 30 min antes
      if (diferencaMinutos > 0 && diferencaMinutos <= 30 && !agendamentosNotificados.includes(servico.id) && !servico.notificado_30min) {
        setServicoAgendamento30Min(servico);
        setDialogAgendamento30Min(true);
        setAgendamentosNotificados(prev => [...prev, servico.id]);
        
        // Mark as notified to avoid repeated notifications
        try {
          await base44.entities.Servico.update(servico.id, {
            ...servico,
            notificado_30min: true,
            alterado_por_id: user.id,
            alterado_por_nome: user.full_name || user.username,
            alterado_por_email: user.email,
            data_alteracao: agoraISO, // Use local ISO time
          });
          queryClient.invalidateQueries(['servicos']);
        } catch (error) {
          console.error("Erro ao marcar notificação de 30min:", error);
        }

        // Play notification sound if available
        if (window.frNotifications && typeof window.frNotifications.playSound === 'function') {
          window.frNotifications.playSound('alerta.mp3');
        }
      }
      
      // Mark as "Atrasado" if past due and not "Concluído" or "Atrasado" already
      if (diferencaMinutos < 0 && servico.status_servico !== "Atrasado" && servico.status_servico !== "Concluído" && servico.status_servico !== "Cancelado" && servico.status_servico !== "Recusado") {
        try {
          await base44.entities.Servico.update(servico.id, {
            ...servico,
            status_servico: "Atrasado",
            alterado_por_id: user.id,
            alterado_por_nome: user.full_name || user.username,
            alterado_por_email: user.email,
            data_alteracao: agoraISO, // Use local ISO time
          });
          queryClient.invalidateQueries(['servicos']);
        } catch (error) {
          console.error("Erro ao marcar serviço como atrasado:", error);
        }
      }
    });
  }, [servicos, user, agendamentosNotificados, queryClient]);


  const handleFecharNotificacao = () => {
    if (naoMostrarMais && servicoNotificacao) {
      const servicosOcultos = JSON.parse(localStorage.getItem('servicos-ocultos') || '{}');
      servicosOcultos[servicoNotificacao.id] = true;
      localStorage.setItem('servicos-ocultos', JSON.stringify(servicosOcultos));
    }
    setDialogNotificacao(false);
    setNaoMostrarMais(false);
    setServicoNotificacao(null);
  };

  const handleAceitarDaNotificacao = () => {
    if (servicoNotificacao) {
      handleAtualizarStatus(new Event('click'), servicoNotificacao, "Aceito");
      handleFecharNotificacao();
    }
  };

  const handleRecusarDaNotificacao = () => {
    if (servicoNotificacao) {
      setServicoSelecionado(servicoNotificacao);
      setDialogNotificacao(false);
      setDialogRecusa(true);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  // ✅ Filtrar serviços do prestador (excluindo recusados)
  const meusServicos = servicos.filter(s => {
    if (!user?.prestador_id) return false;
    if (s.prestador_id !== user.prestador_id) return false;
    // ✅ Excluir serviços recusados do painel do prestador
    if (s.status_servico === "Recusado") return false;
    return true;
  });

  const servicosFiltrados = meusServicos.filter(s => {
    const matchBusca = !busca ||
      s.numero_pedido?.includes(busca) ||
      getClienteNome(s).toLowerCase().includes(busca.toLowerCase()) ||
      s.observacao_geral?.toLowerCase().includes(busca.toLowerCase());

    const matchStatus = !filtroStatus || filtroStatus === "todos" || s.status_servico === filtroStatus;

    return matchBusca && matchStatus;
  });

  // ✅ APLICAR A MESMA ORDENAÇÃO DO MENU "SERVIÇOS" DO ADMIN
  const servicosOrdenados = [...servicosFiltrados].sort((a, b) => {
    // 1. Prioridade: Urgentes (urgente = true) vêm primeiro
    if (a.urgente && !b.urgente) return -1;
    if (!a.urgente && b.urgente) return 1;

    // 2. Prioridade: Agendados não atrasados nem concluídos
    const aAgendado = a.agendado && !["Concluído", "Cancelado", "Recusado"].includes(a.status_servico);
    const bAgendado = b.agendado && !["Concluído", "Cancelado", "Recusado"].includes(b.status_servico);
    
    if (aAgendado && !bAgendado) return -1;
    if (!aAgendado && bAgendado) return 1;

    // 3. Se ambos são agendados, ordenar por data de agendamento (mais próximo primeiro)
    if (aAgendado && bAgendado) {
      const dataA = new Date(a.data_agendamento);
      const dataB = new Date(b.data_agendamento);
      return dataA.getTime() - dataB.getTime();
    }

    // 4. Ordenar por ordem de status (prioridade de workflow)
    const statusPriority = {
      "Aguardando Aceitação": 1,
      "Aceito": 2,
      "Coletado": 3,
      "Atrasado": 4,
      "Concluído": 5,
      "Cancelado": 6,
      "Recusado": 7
    };

    const prioA = statusPriority[a.status_servico] || 999;
    const prioB = statusPriority[b.status_servico] || 999;

    if (prioA !== prioB) {
      return prioA - prioB;
    }

    // 5. Dentro do mesmo status, ordenar por data de criação (mais recente primeiro)
    return new Date(b.created_date).getTime() - new Date(a.created_date).getTime();
  });

  const getClienteNome = (servico) => {
    if (servico.cliente_nome_avulso) return servico.cliente_nome_avulso;
    const cliente = clientes.find(c => c.id === servico.cliente_id);
    return cliente ? cliente.nome : "Cliente não encontrado";
  };

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor || 0);
  };

  const visualizarDetalhes = (servico) => {
    setServicoSelecionado(servico);
    setDialogDetalhes(true);
  };

  const handleAtualizarStatus = (e, servico, novoStatus) => {
    e.stopPropagation();
    updateStatusMutation.mutate({ id: servico.id, status: novoStatus });
  };

  const abrirDialogRecusa = (e, servico) => {
    e.stopPropagation();
    setServicoSelecionado(servico);
    setDialogRecusa(true);
  };

  const handleRecusarServico = () => {
    if (!motivoRecusa.trim()) {
      alert("Por favor, informe o motivo da recusa");
      return;
    }
    if (servicoSelecionado) {
      recusarMutation.mutate({
        servico: servicoSelecionado,
        motivo: motivoRecusa
      });
    }
  };

  const statusColors = {
    "Aguardando Aceitação": "bg-yellow-100 text-yellow-800 border-yellow-300",
    "Aceito": "bg-blue-100 text-blue-800 border-blue-300",
    "Coletado": "bg-purple-100 text-purple-800 border-purple-300",
    "Atrasado": "bg-orange-100 text-orange-800 border-orange-300", // Added color for "Atrasado"
    "Concluído": "bg-green-100 text-green-800 border-green-300",
    "Cancelado": "bg-red-100 text-red-800 border-red-300",
    "Recusado": "bg-red-100 text-red-800 border-red-300"
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4 md:p-8 space-y-6">
      <style>{`
        /* Neon effect for Scheduled Cards */
        @keyframes neon-glow-purple {
          0%, 100% {
            box-shadow: 0 0 10px rgba(147, 51, 234, 0.3), 
                        0 0 20px rgba(147, 51, 234, 0.2),
                        0 0 30px rgba(147, 51, 234, 0.1);
          }
          50% {
            box-shadow: 0 0 20px rgba(147, 51, 234, 0.5), 
                        0 0 40px rgba(147, 51, 234, 0.3),
                        0 0 60px rgba(147, 51, 234, 0.2);
          }
        }

        @keyframes neon-glow-red {
          0%, 100% {
            box-shadow: 0 0 10px rgba(239, 68, 68, 0.3), 
                        0 0 20px rgba(239, 68, 68, 0.2),
                        0 0 30px rgba(239, 68, 68, 0.1);
          }
          50% {
            box-shadow: 0 0 20px rgba(239, 68, 68, 0.5), 
                        0 0 40px rgba(239, 68, 68, 0.3),
                        0 0 60px rgba(239, 68, 68, 0.2);
          }
        }

        @keyframes neon-glow-orange {
          0%, 100% {
            box-shadow: 0 0 10px rgba(249, 115, 22, 0.3), 
                        0 0 20px rgba(249, 115, 22, 0.2),
                        0 0 30px rgba(249, 115, 22, 0.1);
          }
          50% {
            box-shadow: 0 0 20px rgba(249, 115, 22, 0.5), 
                        0 0 40px rgba(249, 115, 22, 0.3),
                        0 0 60px rgba(249, 115, 22, 0.2);
          }
        }


        .card-agendado {
          background: linear-gradient(135deg, rgba(147, 51, 234, 0.1) 0%, rgba(126, 34, 206, 0.05) 100%);
          border: 2px solid rgba(147, 51, 234, 0.5);
          animation: neon-glow-purple 2s ease-in-out infinite;
        }

        .card-atrasado {
          background: linear-gradient(135deg, rgba(249, 115, 22, 0.1) 0%, rgba(234, 88, 12, 0.05) 100%);
          border: 2px solid rgba(249, 115, 22, 0.5);
          animation: neon-glow-orange 2s ease-in-out infinite;
        }
      `}</style>

      {/* Header */}
      <div>
        <h2 className="text-4xl font-bold text-white flex items-center gap-3">
          <Package className="w-10 h-10 text-green-500" />
          Meus Fretes
        </h2>
        <p className="text-gray-400 mt-2">Seus serviços de entrega e transporte</p>
      </div>

      {/* Lista de Serviços */}
      <Card className="shadow-lg border-2 border-green-500/20 bg-gray-800/50 backdrop-blur">
        <CardHeader className="border-b border-green-500/20">
          <div className="space-y-4">
            {/* Busca e Filtros */}
            <div className="flex items-center gap-3 flex-wrap">
              <Search className="w-5 h-5 text-green-500" />
              <Input
                placeholder="Buscar por número, cliente ou observação..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="flex-1 min-w-[200px] border-none bg-transparent focus-visible:ring-0 text-white placeholder:text-gray-500"
              />
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="w-[200px] bg-gray-700 border-green-500/30 text-white">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-green-500/30">
                  <SelectItem value="todos">Todos os Status</SelectItem>
                  <SelectItem value="Aguardando Aceitação">Aguardando Aceitação</SelectItem>
                  <SelectItem value="Aceito">Aceito</SelectItem>
                  <SelectItem value="Coletado">Coletado</SelectItem>
                  <SelectItem value="Atrasado">Atrasado</SelectItem>
                  <SelectItem value="Concluído">Concluído</SelectItem>
                  <SelectItem value="Cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
              
              {/* BOTÃO NOVO SERVIÇO */}
              <Button
                onClick={() => setDialogNovoServico(true)}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Serviço
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {isLoading ? (
            <div className="text-center py-12 col-span-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
            </div>
          ) : servicosOrdenados.length === 0 ? (
            <div className="text-center py-12 col-span-full">
              <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500">Nenhum serviço encontrado</p>
              <p className="text-xs text-gray-600 mt-2">
                Novos serviços aparecerão aqui automaticamente
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {servicosOrdenados.map((servico) => {
                const isAgendado = servico.agendado && servico.data_agendamento;
                const isAtrasado = servico.status_servico === "Atrasado";
                const criadoPeloProprioPrestador = servico.criado_por_email === user?.email && 
                                                   servico.prestador_id === user?.prestador_id;

                const agora = new Date();
                const dataAgendamento = isAgendado ? new Date(servico.data_agendamento) : null;
                
                // Calculate hours and minutes remaining for the scheduled service
                let horasRestantes = 0;
                let minutos = 0;
                if (dataAgendamento) {
                  const diferencaMs = dataAgendamento.getTime() - agora.getTime();
                  const minutosTotais = Math.floor(diferencaMs / 60000);
                  horasRestantes = Math.floor(Math.abs(minutosTotais) / 60);
                  minutos = Math.abs(minutosTotais) % 60;
                }

                const isProximo = dataAgendamento && (dataAgendamento.getTime() - agora.getTime()) > 0 && (dataAgendamento.getTime() - agora.getTime()) <= (2 * 60 * 60 * 1000); // Within 2 hours

                const cardClassName = `hover:shadow-xl transition-all cursor-pointer ${
                  isAtrasado ? 'card-atrasado' : 
                  isAgendado && !isAtrasado ? 'card-agendado' : 
                  servico.urgente ? 'border-red-500 bg-red-500/10 animate-pulse border-2' : 
                  'border-green-500/20 bg-gray-700/30 hover:border-green-500/40 border-2'
                }`;

                return (
                  <Card
                    key={servico.id}
                    className={cardClassName}
                    onClick={() => visualizarDetalhes(servico)}
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-full opacity-50 transform translate-x-16 -translate-y-16" />

                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold px-3 py-1">
                              #{servico.numero_pedido || servico.id.slice(-5).toUpperCase()}
                            </Badge>
                            <Badge className={statusColors[servico.status_servico] + " bg-opacity-20 backdrop-blur"}>
                              {servico.status_servico}
                            </Badge>
                            {servico.urgente && (
                              <Badge className="bg-red-600 text-white animate-pulse">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                URGENTE
                              </Badge>
                            )}
                            {isAgendado && !isAtrasado && (
                              <Badge className={isProximo ? "bg-purple-600 text-white animate-pulse shadow-lg shadow-purple-500/50" : "bg-purple-500 text-white shadow-lg shadow-purple-500/30"}>
                                <CalendarIcon className="w-3 h-3 mr-1" />
                                AGENDADO
                              </Badge>
                            )}
                            {isAtrasado && (
                              <Badge className="bg-orange-600 text-white animate-pulse shadow-lg shadow-orange-500/50">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                ATRASADO
                              </Badge>
                            )}
                          </div>
                          <CardTitle className="text-lg text-white">{getClienteNome(servico)}</CardTitle>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-3 pt-0 space-y-3">
                    {/* Data de Agendamento (se houver) */}
                    {isAgendado && servico.data_agendamento && (
                      <div className={`space-y-2 p-3 rounded-lg border mb-3 ${
                        isAtrasado 
                          ? 'bg-orange-500/10 border-orange-500/30' 
                          : 'bg-purple-500/10 border-purple-500/30'
                      }`}>
                        <div className="flex items-center gap-2 text-sm">
                          <CalendarIcon className={`w-4 h-4 ${isAtrasado ? 'text-orange-400' : 'text-purple-400'}`} />
                          <span className={`font-bold ${isAtrasado ? 'text-orange-300' : 'text-purple-300'}`}>
                            {isAtrasado ? '⚠️ Atrasado:' : 'Agendado para:'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className={`w-4 h-4 ${isAtrasado ? 'text-orange-400' : 'text-purple-400'}`} />
                          <span className={`font-bold ${isAtrasado ? 'text-orange-300' : 'text-purple-300'}`}>
                            {formatDateTimeFull(servico.data_agendamento)}
                          </span>
                        </div>

                        <div className={`text-xs font-semibold mt-2 ${isAtrasado ? 'text-orange-300' : 'text-purple-300'}`}>
                          {isAtrasado ? 
                            `⚠️ Atrasado há ${horasRestantes}h ${minutos}min` :
                            (horasRestantes > 0 || minutos > 0 ? `⏰ Faltam ${horasRestantes}h ${minutos}min` : "⏰ Agendamento agora")
                          }
                        </div>
                      </div>
                    )}

                    {/* ✅ TODOS OS ENDEREÇOS NA ORDEM - Layout Vertical */}
                    <div className="space-y-3 bg-gray-700/30 p-3 rounded-lg border border-gray-600">
                      {servico.enderecos && servico.enderecos.length > 0 ? (
                        <div className="space-y-3">
                          {servico.enderecos.map((end, idx) => (
                            <div key={idx} className="space-y-1">
                              {/* Badge e Ícone em cima */}
                              <div className="flex items-center gap-2">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                                  end.tipo === "Coleta" ? "bg-blue-500" : "bg-green-500"
                                }`}>
                                  <MapPin className="w-3 h-3 text-white" />
                                </div>
                                <Badge variant="outline" className={`text-xs px-2 py-0.5 ${
                                  end.tipo === "Coleta" ? "border-blue-500/50 text-blue-300" : "border-green-500/50 text-green-300"
                                }`}>
                                  {end.tipo}
                                </Badge>
                              </div>
                              
                              {/* ✅ ENDEREÇO COM QUEBRA DE LINHA */}
                              <p className="text-sm text-white pl-7 break-words whitespace-normal overflow-wrap-anywhere">
                                {end.endereco}
                              </p>
                              
                              {/* Observação (se houver) */}
                              {end.observacao && (
                                <p className="text-xs text-gray-400 pl-7 italic break-words whitespace-normal overflow-wrap-anywhere">
                                  Obs: {end.observacao}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500">Sem endereços cadastrados</p>
                      )}
                    </div>

                    {/* Valores */}
                    <div className="space-y-2 bg-gradient-to-br from-green-500/10 to-emerald-500/10 p-3 rounded-lg border border-green-500/30">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">Valor do Serviço</span>
                        <span className="text-lg font-bold text-green-400">{formatarMoeda(servico.valor_total)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Forma de Pgto</span>
                        <Badge variant="outline" className="text-xs border-gray-600 text-gray-300">{servico.forma_pagamento}</Badge>
                      </div>
                    </div>

                    {servico.observacao_geral && (
                      <div className="text-sm text-gray-300 bg-gray-700/30 p-3 rounded-lg border border-gray-600">
                        <span className="font-medium">Obs:</span> {servico.observacao_geral}
                      </div>
                    )}

                    {/* Botões de Ação */}
                    <div className="space-y-2 pt-2 border-t border-gray-700">
                      {servico.status_servico === "Aguardando Aceitação" && !criadoPeloProprioPrestador && (
                        <>
                          <Button
                            onClick={(e) => handleAtualizarStatus(e, servico, "Aceito")}
                            className="w-full bg-blue-500 hover:bg-blue-600"
                            size="sm"
                            disabled={updateStatusMutation.isPending}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            {updateStatusMutation.isPending ? "Processando..." : "Aceitar Serviço"}
                          </Button>
                          <Button
                            onClick={(e) => abrirDialogRecusa(e, servico)}
                            variant="outline"
                            className="w-full text-red-400 border-red-500/30 hover:bg-red-500/10"
                            size="sm"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Recusar Serviço
                          </Button>
                        </>
                      )}

                      {servico.status_servico === "Aceito" && (
                        <>
                          {podeEditarServico(servico) && (
                            <Button
                              onClick={(e) => abrirEdicao(e, servico)}
                              variant="outline"
                              className="w-full border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
                              size="sm"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Editar Serviço
                              {getTempoRestanteEdicao(servico) && (
                                <span className="ml-2 text-xs">({getTempoRestanteEdicao(servico)})</span>
                              )}
                            </Button>
                          )}
                          <Button
                            onClick={(e) => handleAtualizarStatus(e, servico, "Coletado")}
                            className="w-full bg-purple-500 hover:bg-purple-600"
                            size="sm"
                            disabled={updateStatusMutation.isPending}
                          >
                            <Package className="w-4 h-4 mr-2" />
                            {updateStatusMutation.isPending ? "Processando..." : "Marcar como Coletado"}
                          </Button>
                        </>
                      )}

                      {servico.status_servico === "Coletado" && (
                        <Button
                          onClick={(e) => handleAtualizarStatus(e, servico, "Concluído")}
                          className="w-full bg-green-500 hover:bg-green-600"
                          size="sm"
                          disabled={updateStatusMutation.isPending}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          {updateStatusMutation.isPending ? "Processando..." : "Marcar como Concluído"}
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          visualizarDetalhes(servico);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Ver Detalhes
                      </Button>
                    </div>

                    <p className="text-sm text-gray-400 mt-3 flex items-center gap-1 border-t pt-3 border-gray-700">
                        <Clock className="w-3 h-3" />
                        Criado em: {formatDateTime(servico.created_date)}
                    </p>
                  </CardContent>
                </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Novo Serviço */}
      <ServicoDialog
        aberto={dialogNovoServico}
        setAberto={setDialogNovoServico}
        prestadorFixo={user?.prestador_id}
        onServicoCreated={() => queryClient.invalidateQueries(['servicos'])}
        currentUser={user}
        prestadoresData={prestadores} // Pass prestadores data
        clientesData={clientes} // Pass clients data
      />

      {/* Dialog Edição de Serviço */}
      <EditarServicoDialog
        aberto={dialogEdicao}
        setAberto={setDialogEdicao}
        servico={servicoSelecionado}
        onSalvar={handleSalvarEdicao}
        tempoRestante={servicoSelecionado ? getTempoRestanteEdicao(servicoSelecionado) : null}
      />

      {/* Dialog de Notificação de Novo Serviço */}
      <Dialog open={dialogNotificacao} onOpenChange={setDialogNotificacao}>
        <DialogContent className="bg-gray-800 border-green-500/30 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-yellow-400 animate-pulse" />
              Novo Serviço Disponível!
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              Um novo serviço foi atribuído a você
            </DialogDescription>
          </DialogHeader>

          {servicoNotificacao && (
            <div className="space-y-4">
              <Card className="bg-gray-700/50 border-green-500/30">
                <CardContent className="p-4 space-y-3">
                  <div>
                    <p className="text-xs text-gray-400">Número do Pedido</p>
                    <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold mt-1">
                      #{servicoNotificacao.numero_pedido || servicoNotificacao.id.slice(-5).toUpperCase()}
                    </Badge>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400">Cliente</p>
                    <p className="font-semibold text-white">{getClienteNome(servicoNotificacao)}</p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400">Valor do Serviço</p>
                    <p className="text-xl font-bold text-green-400">{formatarMoeda(servicoNotificacao.valor_total)}</p>
                  </div>

                  {servicoNotificacao.urgente && (
                    <Badge className="bg-red-600 text-white w-full justify-center py-1 animate-pulse">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      SERVIÇO URGENTE!
                    </Badge>
                  )}

                  {servicoNotificacao.agendado && servicoNotificacao.data_agendamento && (
                    <div>
                      <p className="text-xs text-gray-400">Data Agendada</p>
                      <p className="text-sm font-semibold text-purple-400">
                        {formatDateTimeFull(servicoNotificacao.data_agendamento)}
                      </p>
                      {servicoNotificacao.data_agendamento && (
                        <span className="text-xs ml-1 text-purple-400">({getRelativeTime(servicoNotificacao.data_agendamento)})</span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex items-center space-x-2 bg-gray-700/30 p-3 rounded-lg">
                <Checkbox
                  id="nao-mostrar"
                  checked={naoMostrarMais}
                  onCheckedChange={setNaoMostrarMais}
                />
                <label htmlFor="nao-mostrar" className="text-sm text-gray-300 cursor-pointer">
                  Não mostrar mais este serviço
                </label>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleAceitarDaNotificacao}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                  disabled={updateStatusMutation.isPending}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Aceitar
                </Button>
                <Button
                  onClick={handleRecusarDaNotificacao}
                  variant="outline"
                  className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
                  disabled={recusarMutation.isPending} // Use recusarMutation.isPending here
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Recusar
                </Button>
              </div>

              <Button
                onClick={handleFecharNotificacao}
                variant="ghost"
                className="w-full text-gray-400"
              >
                Decidir depois
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Notificação 30 min antes */}
      <Dialog open={dialogAgendamento30Min} onOpenChange={setDialogAgendamento30Min}>
        <DialogContent className="bg-gray-800 border-purple-500/30 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <CalendarIcon className="w-6 h-6 text-purple-400 animate-pulse" />
              Agendamento Próximo!
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              Você tem um serviço agendado em 30 minutos
            </DialogDescription>
          </DialogHeader>

          {servicoAgendamento30Min && (
            <div className="space-y-4">
              <Card className="bg-gray-700/50 border-purple-500/30">
                <CardContent className="p-4 space-y-3">
                  <div>
                    <p className="text-xs text-gray-400">Número do Pedido</p>
                    <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold mt-1">
                      #{servicoAgendamento30Min.numero_pedido || servicoAgendamento30Min.id.slice(-5).toUpperCase()}
                    </Badge>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400">Cliente</p>
                    <p className="font-semibold text-white">{getClienteNome(servicoAgendamento30Min)}</p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400">Horário</p>
                    <p className="text-lg font-bold text-purple-400">
                      {formatDateTime(servicoAgendamento30Min.data_agendamento)}
                    </p>
                  </div>

                  {servicoAgendamento30Min.enderecos && servicoAgendamento30Min.enderecos.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-400 mb-2">Endereços:</p>
                      {servicoAgendamento30Min.enderecos.map((end, idx) => (
                        <div key={idx} className="text-sm text-white mb-1">
                          <span className={end.tipo === "Coleta" ? "text-blue-400" : "text-green-400"}>
                            {end.tipo}:
                          </span> {end.endereco}
                        </div>
                      ))}
                    </div>
                  )}

                  <div>
                    <p className="text-xs text-gray-400">Valor</p>
                    <p className="text-xl font-bold text-green-400">{formatarMoeda(servicoAgendamento30Min.valor_total)}</p>
                  </div>
                </CardContent>
              </Card>

              <Button
                onClick={() => {
                  visualizarDetalhes(servicoAgendamento30Min);
                  setDialogAgendamento30Min(false);
                }}
                className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
              >
                <Eye className="w-4 h-4 mr-2" />
                Ver Detalhes
              </Button>

              <Button
                onClick={() => setDialogAgendamento30Min(false)}
                variant="ghost"
                className="w-full text-gray-400"
              >
                Fechar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Recusa */}
      <Dialog open={dialogRecusa} onOpenChange={setDialogRecusa}>
        <DialogContent className="bg-gray-800 border-green-500/30">
          <DialogHeader>
            <DialogTitle className="text-white">Recusar Serviço</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-300">
              Por favor, informe o motivo da recusa do serviço #{servicoSelecionado?.numero_pedido || servicoSelecionado?.id.slice(-5).toUpperCase()}
            </p>
            <div className="space-y-2">
              <Label htmlFor="motivo-recusa" className="text-gray-300">Motivo da Recusa *</Label>
              <Textarea
                id="motivo-recusa"
                value={motivoRecusa}
                onChange={(e) => setMotivoRecusa(e.target.value)}
                placeholder="Ex: Não tenho disponibilidade para esta data, distância muito grande, etc."
                rows={4}
                className="bg-gray-700/50 border-green-500/30 text-white placeholder:text-gray-500"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDialogRecusa(false)} className="border-gray-600 text-gray-300">
                Cancelar
              </Button>
              <Button
                onClick={handleRecusarServico}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                disabled={recusarMutation.isPending || !motivoRecusa.trim()}
              >
                {recusarMutation.isPending ? "Recusando..." : "Confirmar Recusa"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Detalhes */}
      <Dialog open={dialogDetalhes} onOpenChange={setDialogDetalhes}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-gray-800 border-2 border-green-500/30">
          <DialogHeader>
            <DialogTitle className="text-white">Detalhes do Serviço #{servicoSelecionado?.numero_pedido || servicoSelecionado?.id.slice(-5).toUpperCase()}</DialogTitle>
          </DialogHeader>

          {servicoSelecionado && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Cliente</p>
                  <p className="font-semibold text-white">{getClienteNome(servicoSelecionado)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Data de Criação</p>
                  <p className="font-semibold text-white">
                    {formatDateTime(servicoSelecionado.created_date)}
                  </p>
                  {servicoSelecionado.created_date && (
                    <span className="text-xs ml-1 text-gray-400">({getRelativeTime(servicoSelecionado.created_date)})</span>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-400">Valor Total</p>
                  <p className="font-semibold text-green-400">{formatarMoeda(servicoSelecionado.valor_total)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Sua Comissão</p>
                  <p className="font-semibold text-green-400">{formatarMoeda(servicoSelecionado.comissao_prestador)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Forma de Pagamento</p>
                  <Badge variant="outline" className="border-green-500/30 text-green-400">{servicoSelecionado.forma_pagamento}</Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Status</p>
                  <Badge className={statusColors[servicoSelecionado.status_servico]}>
                    {servicoSelecionado.status_servico}
                  </Badge>
                </div>
                {servicoSelecionado.tipo_veiculo && (
                  <div>
                    <p className="text-sm text-gray-400">Tipo de Veículo</p>
                    <p className="font-semibold text-white">{servicoSelecionado.tipo_veiculo}</p>
                  </div>
                )}
                {servicoSelecionado.distancia_km && (
                  <div>
                    <p className="text-sm text-gray-400">Distância</p>
                    <p className="font-semibold text-white">{servicoSelecionado.distancia_km} km</p>
                  </div>
                )}
              </div>

              {servicoSelecionado.status_servico === "Recusado" && servicoSelecionado.motivo_recusa && (
                <div>
                  <p className="text-sm text-gray-400">Motivo da Recusa</p>
                  <p className="text-sm text-white mt-1 bg-gray-700/50 p-3 rounded-lg border border-red-500/30">
                    {servicoSelecionado.motivo_recusa}
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-400 mb-3">Itinerário Completo</p>
                <div className="space-y-3">
                  {servicoSelecionado.enderecos?.map((end, idx) => (
                    <Card key={idx} className="p-4 bg-gray-700/50 border-green-500/20">
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-green-500 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs border-green-500/30 text-green-400">
                              {end.tipo}
                            </Badge>
                          </div>
                          <p className="text-sm text-white break-words whitespace-normal overflow-wrap-anywhere">{end.endereco}</p>
                          {end.observacao && (
                            <p className="text-xs text-gray-400 mt-1 break-words whitespace-normal overflow-wrap-anywhere">Obs: {end.observacao}</p>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {servicoSelecionado.agendado && servicoSelecionado.data_agendamento && (
                <div>
                  <p className="text-sm text-gray-400">Agendamento</p>
                  <div className="flex items-center gap-2 mt-1">
                    <CalendarIcon className="w-4 h-4 text-purple-500" />
                    <p className="font-semibold text-white">
                      {formatDateTimeFull(servicoSelecionado.data_agendamento)}
                    </p>
                    {servicoSelecionado.data_agendamento && (
                      <span className="text-xs ml-1 text-gray-400">({getRelativeTime(servicoSelecionado.data_agendamento)})</span>
                    )}
                  </div>
                </div>
              )}

              {servicoSelecionado.observacao_geral && (
                <div>
                  <p className="text-sm text-gray-400">Observações Gerais</p>
                  <p className="text-sm text-white mt-1 bg-gray-700/50 p-3 rounded-lg border border-green-500/20">
                    {servicoSelecionado.observacao_geral}
                  </p>
                </div>
              )}

              {/* INFORMAÇÕES DE AUDITORIA */}
              {(servicoSelecionado.criado_por_nome || servicoSelecionado.alterado_por_nome || servicoSelecionado.aceito_por_nome) && (
                <div className="pt-4 border-t border-gray-700 space-y-1 text-xs text-gray-500">
                  {servicoSelecionado.criado_por_nome && (
                    <p className="flex items-center gap-1">
                      {servicoSelecionado.aceito_por_nome && servicoSelecionado.criado_por_email === user?.email && servicoSelecionado.prestador_id === user?.prestador_id ? (
                        // If created by self and accepted, show as combined
                        <>
                          <Clock className="w-3 h-3" /> Criado e aceito por: <span className="text-green-400 font-medium">{servicoSelecionado.criado_por_nome}</span>
                          {servicoSelecionado.created_date && (
                            <span className="text-gray-400">• {formatDateTime(servicoSelecionado.created_date)}</span>
                          )}
                        </>
                      ) : (
                        // Normal creation
                        <>
                          <Clock className="w-3 h-3" /> Criado por: <span className="text-gray-400">{servicoSelecionado.criado_por_nome}</span>
                          {servicoSelecionado.created_date && (
                            <span className="text-gray-400">• {formatDateTime(servicoSelecionado.created_date)}</span>
                          )}
                        </>
                      )}
                    </p>
                  )}
                  
                  {/* Show separate acceptance if not auto-accepted (criado_por_email check for prestador context) */}
                  {servicoSelecionado.aceito_por_nome && !(servicoSelecionado.criado_por_email === user?.email && servicoSelecionado.prestador_id === user?.prestador_id) && (
                    <p className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Aceito por: <span className="text-gray-400">{servicoSelecionado.aceito_por_nome}</span>
                      {servicoSelecionado.data_aceite && (
                        <span className="text-gray-400">• {formatDateTime(servicoSelecionado.data_aceite)}</span>
                      )}
                    </p>
                  )}

                  {servicoSelecionado.alterado_por_nome && servicoSelecionado.data_alteracao && (
                    <p className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Alterado por: <span className="text-gray-400">{servicoSelecionado.alterado_por_nome}</span>
                      <span className="text-gray-400">• {formatDateTime(servicoSelecionado.data_alteracao)}</span>
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setDialogDetalhes(false)} className="border-gray-600 text-gray-300 hover:bg-gray-700">
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
