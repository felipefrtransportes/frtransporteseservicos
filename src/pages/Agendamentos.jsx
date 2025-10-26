
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, User, AlertTriangle, Eye, CheckCircle2, XCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import EditarAgendamentoDialog from "../components/servicos/EditarAgendamentoDialog";
import { formatDateTime, formatDateTimeFull, formatDateFull, formatTimeOnly } from "@/components/utils/dateUtils";

// Helper function to convert a local datetime string (e.g., "YYYY-MM-DDTHH:MM") to ISO string
// while preserving the local time.
// This is necessary because new Date("YYYY-MM-DDTHH:MM").toISOString() interprets the string
// as UTC if the time is omitted, but as local time if time is included.
// To ensure it's always treated as local, we construct it with parts.
const fromInputDateTimeToISO = (localDateTimeString) => {
  if (!localDateTimeString) return null;
  const [datePart, timePart] = localDateTimeString.split('T');
  if (!datePart || !timePart) return null;

  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);

  // Create a Date object in the local timezone
  const localDate = new Date(year, month - 1, day, hour, minute, 0, 0);

  // Return the ISO string for this local date.
  // toISOString always converts to UTC.
  // To get an ISO string that represents the *local* time,
  // we need to manually construct it or adjust for timezone offset if storing as UTC.
  // If the backend expects a standard ISO string, we can simply return localDate.toISOString().
  // However, for consistency and to truly 'sync' local time,
  // it's often better to send the local time in a fixed format or explicitly state it's local.
  // For most APIs, sending localDate.toISOString() is standard, but the server needs to know
  // to interpret it as the user's *intended* local time, not UTC.
  // If the goal is to store the exact string "YYYY-MM-DDTHH:MM" + timezone,
  // we might need a different approach.
  // For this context, assuming `toISOString()` is fine and the server handles it appropriately,
  // or that `data_agendamento` is expected to be a `datetime-local` format without 'Z'.
  // Given the previous code where `parseISO` is used, the backend likely expects ISO format.
  // The crucial part is that `new Date(string)` constructor with "YYYY-MM-DDTHH:MM"
  // already interprets it in the local timezone, so `toISOString()` converts that local time to UTC.
  // Example: new Date("2023-10-27T10:00").toISOString() in São Paulo (GMT-3) would be "2023-10-27T13:00:00.000Z"
  // This is the correct behavior if the server stores UTC and converts back to local for display.
  // So, no complex manual construction is needed here; the Date constructor handles it.
  return localDate.toISOString();
};


export default function Agendamentos() {
  const [dataFiltro, setDataFiltro] = useState("");
  const [user, setUser] = useState(null);
  const [dialogDetalhes, setDialogDetalhes] = useState(false);
  const [dialogRecusa, setDialogRecusa] = useState(false);
  const [dialogAgendamento, setDialogAgendamento] = useState(false);
  const [servicoSelecionado, setServicoSelecionado] = useState(null);
  const [motivoRecusa, setMotivoRecusa] = useState("");

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
        return await base44.entities.Servico.list('-data_agendamento');
      } catch (error) {
        console.error("Erro ao carregar serviços:", error);
        return [];
      }
    },
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
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      try {
        // ✅ USAR HORÁRIO LOCAL DO DISPOSITIVO
        const agora = new Date().toISOString();

        // ✅ Se está recusando o serviço, registrar no histórico
        if (data.status_servico === "Recusado" && data.motivo_recusa) {
          const servico = servicos.find(s => s.id === id);
          if (servico) {
            try {
              await base44.entities.RecusaServico.create({
                servico_id: servico.id,
                numero_pedido: servico.numero_pedido,
                prestador_id: user?.prestador_id,
                prestador_nome: user?.full_name || "Prestador",
                cliente_nome: servico.cliente_nome_avulso || (clientes.find(c => c.id === servico.cliente_id)?.nome || "Cliente não identificado"),
                valor_servico: servico.valor_total,
                motivo_recusa: data.motivo_recusa,
                data_recusa: agora,
                data_servico: servico.created_date
              });
              console.log("✅ Recusa de agendamento registrada no histórico");
            } catch (error) {
              console.error("❌ Erro ao registrar recusa:", error);
            }
          }
        }

        data.alterado_por_nome = user?.full_name || "Sistema";
        data.alterado_por_email = user?.email || "sistema@fr.com";
        data.alteracao = agora;

        // Converter data_agendamento mantendo horário local
        // If data.data_agendamento comes from an input type="datetime-local",
        // it will be in format "YYYY-MM-DDTHH:MM" and won't include 'Z'.
        // If it's already an ISO string (e.g., from a database), it will include 'Z'.
        if (data.data_agendamento && !data.data_agendamento.includes('Z')) {
          data.data_agendamento = fromInputDateTimeToISO(data.data_agendamento);
        }

        return await base44.entities.Servico.update(id, data);
      } catch (error) {
        console.error("Erro ao atualizar serviço:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['servicos']);
      queryClient.invalidateQueries(['recusas']); // ✅ Atualizar dashboard
      setDialogRecusa(false);
      setMotivoRecusa("");
      setServicoSelecionado(null);
    },
    onError: (error) => {
      alert("Erro ao atualizar serviço: " + error.message);
    }
  });

  // AJUSTADO: Incluir TODOS os agendamentos, incluindo atrasados
  const deveExibirNoAgendamentos = (servico) => {
    // Verificar se tem agendamento
    if (!servico.agendado || !servico.data_agendamento) return false;
    
    // Não mostrar se já foi concluído, cancelado ou recusado
    if (["Concluído", "Cancelado", "Recusado"].includes(servico.status_servico)) {
      return false;
    }
    
    // Mostrar todos os outros (incluindo atrasados e futuros)
    return true;
  };

  let servicosAgendados = servicos.filter(s => deveExibirNoAgendamentos(s));

  if (user?.tipos_usuario?.includes("Prestador") && user.prestador_id) {
    servicosAgendados = servicosAgendados.filter(s => s.prestador_id === user.prestador_id);
  }

  if (dataFiltro) {
    const dataFiltrada = parseISO(dataFiltro);
    
    servicosAgendados = servicosAgendados.filter(s => {
      const dataAgend = parseISO(s.data_agendamento);
      return format(dataAgend, 'yyyy-MM-dd') === format(dataFiltrada, 'yyyy-MM-dd');
    });
  }

  // ORDENAÇÃO: Atrasados primeiro, depois próximos, depois futuros
  servicosAgendados = servicosAgendados.sort((a, b) => {
    const agora = new Date();
    const aAtrasado = new Date(a.data_agendamento) < agora;
    const bAtrasado = new Date(b.data_agendamento) < agora;
    
    // Atrasados sempre primeiro
    if (aAtrasado && !bAtrasado) return -1;
    if (!aAtrasado && bAtrasado) return 1;
    
    // Se ambos ou nenhum estão atrasados, ordenar por data de agendamento (mais próximo primeiro)
    const dataA = new Date(a.data_agendamento);
    const dataB = new Date(b.data_agendamento);
    return dataA - dataB;
  });

  const statusColors = {
    "Aguardando Aceitação": "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    "Aceito": "bg-blue-500/20 text-blue-300 border-blue-500/30",
    "Coletado": "bg-purple-500/20 text-purple-300 border-purple-500/30",
    "Concluído": "bg-green-500/20 text-green-300 border-green-500/30",
    "Cancelado": "bg-gray-500/20 text-gray-300 border-gray-500/30",
    "Recusado": "bg-red-500/20 text-red-300 border-red-500/30"
  };

  const pagamentoColors = {
    "Pendente": "bg-yellow-500/20 text-yellow-300",
    "Pago": "bg-green-500/20 text-green-300"
  };

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
    
    const resumoColeta = coleta ? coleta.endereco.split(',').slice(0, 2).join(',') : "Sem origem";
    const resumoEntrega = entrega ? entrega.endereco.split(',').slice(0, 2).join(',') : "Sem destino";
    
    return { coleta: resumoColeta, entrega: resumoEntrega };
  };

  const visualizarDetalhes = (servico) => {
    setServicoSelecionado(servico);
    setDialogDetalhes(true);
  };

  const handleAtualizarStatus = (e, servico, novoStatus) => {
    e.stopPropagation();
    updateMutation.mutate({ id: servico.id, data: { ...servico, status_servico: novoStatus } });
  };

  const handleMarcarPago = (e, servico) => {
    e.stopPropagation();
    const novoStatus = servico.status_pagamento === "Pago" ? "Pendente" : "Pago";
    updateMutation.mutate({ id: servico.id, data: { ...servico, status_pagamento: novoStatus } });
  };

  const handleMarcarUrgente = (e, servico) => {
    e.stopPropagation();
    updateMutation.mutate({ id: servico.id, data: { ...servico, urgente: !servico.urgente } });
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
    updateMutation.mutate({
      id: servicoSelecionado.id,
      data: { ...servicoSelecionado, status_servico: "Recusado", motivo_recusa: motivoRecusa }
    });
  };

  const abrirEdicaoAgendamento = (e, servico) => {
    e.stopPropagation();
    setServicoSelecionado(servico);
    setDialogAgendamento(true);
  };

  const handleSalvarAgendamento = (dadosAgendamento) => {
    updateMutation.mutate({
      id: servicoSelecionado.id,
      data: { 
        ...servicoSelecionado, 
        agendado: dadosAgendamento.agendado,
        data_agendamento: dadosAgendamento.agendado ? dadosAgendamento.data_agendamento : null
      }
    });
    setDialogAgendamento(false);
  };

  const isAdmin = user?.tipos_usuario?.includes("Administrador");
  const isPrestador = user?.tipos_usuario?.includes("Prestador");

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4 md:p-8 space-y-6">
      <style>{`
        /* Efeito Neon para Cards Agendados */
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

        .card-agendado {
          background: linear-gradient(135deg, rgba(147, 51, 234, 0.1) 0%, rgba(126, 34, 206, 0.05) 100%);
          border: 2px solid rgba(147, 51, 234, 0.5);
        }

        .card-atrasado {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.05) 100%);
          border: 2px solid rgba(239, 68, 68, 0.5);
          animation: neon-glow-red 2s ease-in-out infinite;
        }

        .card-agendado.animate-pulse {
          animation: neon-glow-purple 2s ease-in-out infinite;
        }
      `}</style>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-4xl font-bold text-white flex items-center gap-3">
            <Calendar className="w-10 h-10 text-green-500" />
            Agendamentos
          </h2>
          <p className="text-gray-400 mt-2">Serviços programados para execução futura</p>
          <p className="text-xs text-gray-500 mt-1">
            Serviços agendados (incluindo atrasados) aparecem aqui
          </p>
        </div>
        
        <div className="w-full md:w-64">
          <Label className="text-xs text-gray-400">Filtrar por Data</Label>
          <Input
            type="date"
            value={dataFiltro}
            onChange={(e) => setDataFiltro(e.target.value)}
            className="mt-1 bg-gray-700 border-green-500/30 text-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
          </div>
        ) : servicosAgendados.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500">Nenhum agendamento encontrado</p>
            <p className="text-xs text-gray-600 mt-2">
              Serviços agendados (incluindo atrasados) aparecem aqui
            </p>
          </div>
        ) : (
          servicosAgendados.map((servico) => {
            const dataAgendamento = parseISO(servico.data_agendamento);
            const agora = new Date();
            const minutosRestantes = Math.floor((dataAgendamento.getTime() - agora.getTime()) / 60000);
            const horasRestantes = Math.floor(minutosRestantes / 60);
            const minutos = Math.abs(minutosRestantes % 60); // Use Math.abs for minutes to show positive value for difference
            const isProximo = minutosRestantes > 0 && minutosRestantes <= 120; // Only for future services that are "soon"
            const isAtrasado = minutosRestantes < 0; // Check if the service is overdue
            const enderecos = getEnderecoResumo(servico);

            return (
              <Card 
                key={servico.id} 
                className={`hover:shadow-xl transition-all cursor-pointer ${
                  isAtrasado
                    ? 'card-atrasado'
                    : 'card-agendado' // Default for non-late
                } ${
                  ((isProximo && !isAtrasado) || servico.urgente) ? 'animate-pulse' : ''
                }`}
                onClick={() => visualizarDetalhes(servico)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold px-3 py-1">
                        #{servico.numero_pedido || servico.id.slice(-5).toUpperCase()}
                      </Badge>
                      <Badge className={statusColors[servico.status_servico]}>
                        {servico.status_servico}
                      </Badge>
                      {isAtrasado ? (
                        <Badge className="bg-orange-600 text-white animate-pulse shadow-lg shadow-orange-500/50">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          ATRASADO
                        </Badge>
                      ) : (
                        <Badge className={isProximo ? "bg-purple-600 text-white animate-pulse shadow-lg shadow-purple-500/50" : "bg-purple-500 text-white shadow-lg shadow-purple-500/30"}>
                          <Calendar className="w-3 h-3 mr-1" />
                          AGENDADO
                        </Badge>
                      )}
                      {servico.urgente && (
                        <Badge className="bg-red-600 text-white">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          URGENTE
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardTitle className="text-lg text-white">
                    {getClienteNome(servico)}
                  </CardTitle>
                  <p className="text-sm text-gray-400 flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />
                    Criado: {formatDateTime(servico.created_date)}
                  </p>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Data e Hora do Agendamento */}
                  <div className={`space-y-2 p-3 rounded-lg border ${
                    isAtrasado 
                      ? 'bg-orange-500/10 border-orange-500/30' 
                      : 'bg-purple-500/10 border-purple-500/30'
                  }`}>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className={`w-4 h-4 ${isAtrasado ? 'text-orange-400' : 'text-purple-400'}`} />
                      <span className={`font-bold ${isAtrasado ? 'text-orange-300' : 'text-purple-300'}`}>
                        {isAtrasado ? '⚠️ Atrasado:' : 'Agendado para:'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className={`w-4 h-4 ${isAtrasado ? 'text-orange-400' : 'text-purple-400'}`} />
                      <span className={`font-bold ${isAtrasado ? 'text-orange-300' : 'text-purple-300'}`}>
                        {formatDateTimeFull(dataAgendamento)}
                      </span>
                    </div>

                    <div className={`text-xs font-semibold mt-2 ${isAtrasado ? 'text-orange-300' : 'text-purple-300'}`}>
                      {isAtrasado ? 
                        `⚠️ Atrasado há ${Math.abs(horasRestantes)}h ${minutos}min` :
                        `⏰ Faltam ${horasRestantes}h ${minutos}min`
                      }
                    </div>
                  </div>

                  {/* Prestador */}
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-300">{servico.prestador_nome}</span>
                  </div>

                  {/* Endereços */}
                  <div className="space-y-2 bg-gray-700/30 p-3 rounded-lg border border-gray-600">
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-3 h-3 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500">Coleta</p>
                        <p className="text-sm font-medium text-white truncate">{enderecos.coleta}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-3 h-3 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500">Entrega</p>
                        <p className="text-sm font-medium text-white truncate">{enderecos.entrega}</p>
                      </div>
                    </div>
                  </div>

                  {/* Valores */}
                  <div className="space-y-2 bg-gradient-to-br from-green-500/10 to-emerald-500/10 p-3 rounded-lg border border-green-500/30">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Valor Total</span>
                      <span className="text-lg font-bold text-green-400">{formatarMoeda(servico.valor_total)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Pagamento</span>
                      <Badge variant="outline" className="text-xs border-gray-600 text-gray-300">{servico.forma_pagamento}</Badge>
                    </div>
                    {isAdmin && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Status Pgto</span>
                        <Badge className={pagamentoColors[servico.status_pagamento]}>
                          {servico.status_pagamento}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {servico.observacao_geral && (
                    <div className="text-sm text-gray-300 bg-gray-700/30 p-3 rounded-lg border border-gray-600">
                      <span className="font-medium">Obs:</span> {servico.observacao_geral}
                    </div>
                  )}

                  {/* Botões de Ação */}
                  <div className="space-y-2 pt-2 border-t border-gray-700">
                    <Button
                      onClick={(e) => abrirEdicaoAgendamento(e, servico)}
                      variant="outline"
                      className="w-full border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                      size="sm"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Editar Agendamento
                    </Button>

                    {isPrestador && (
                      <>
                        {servico.status_servico === "Aguardando Aceitação" && (
                          <>
                            <Button
                              onClick={(e) => handleAtualizarStatus(e, servico, "Aceito")}
                              className="w-full bg-blue-500 hover:bg-blue-600"
                              size="sm"
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Aceitar Serviço
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
                      </>
                    )}

                    {isAdmin && (
                      <>
                        {servico.forma_pagamento === "PIX" && (
                          <Button
                            onClick={(e) => handleMarcarPago(e, servico)}
                            variant={servico.status_pagamento === "Pago" ? "outline" : "default"}
                            className={servico.status_pagamento === "Pago" ? "w-full border-gray-600 text-gray-300" : "w-full bg-green-500 hover:bg-green-600"}
                            size="sm"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            {servico.status_pagamento === "Pago" ? "Marcar como Pendente" : "Marcar como Pago"}
                          </Button>
                        )}
                        
                        <Button
                          onClick={(e) => handleMarcarUrgente(e, servico)}
                          variant={servico.urgente ? "destructive" : "outline"}
                          className={!servico.urgente ? "w-full border-gray-600 text-gray-300 hover:bg-gray-700" : "w-full"}
                          size="sm"
                        >
                          <AlertTriangle className="w-4 h-4 mr-1" />
                          {servico.urgente ? "Remover Urgência" : "Marcar como Urgente"}
                        </Button>
                      </>
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
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Dialog de Edição de Agendamento */}
      <EditarAgendamentoDialog
        aberto={dialogAgendamento}
        setAberto={setDialogAgendamento}
        servico={servicoSelecionado}
        onSalvar={handleSalvarAgendamento}
      />

      {/* Dialog de Recusa */}
      <Dialog open={dialogRecusa} onOpenChange={setDialogRecusa}>
        <DialogContent className="bg-gray-800 border-2 border-green-500/30">
          <DialogHeader>
            <DialogTitle className="text-white">Recusar Serviço</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Por favor, informe o motivo da recusa do serviço #{servicoSelecionado?.numero_pedido}
            </p>
            <div className="space-y-2">
              <Label htmlFor="motivo-recusa" className="text-gray-300">Motivo da Recusa *</Label>
              <Textarea
                id="motivo-recusa"
                value={motivoRecusa}
                onChange={(e) => setMotivoRecusa(e.target.value)}
                placeholder="Ex: Não tenho disponibilidade para esta data, distância muito grande, etc."
                rows={4}
                className="bg-gray-700 border-green-500/30 text-white"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDialogRecusa(false)} className="border-gray-600 text-gray-300 hover:bg-gray-700">
                Cancelar
              </Button>
              <Button
                onClick={handleRecusarServico}
                className="bg-red-500 hover:bg-red-600"
                disabled={updateMutation.isPending || !motivoRecusa.trim()}
              >
                {updateMutation.isPending ? "Recusando..." : "Confirmar Recusa"}
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
                  <p className="text-sm text-gray-500">Cliente</p>
                  <p className="font-semibold text-white">{getClienteNome(servicoSelecionado)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Prestador</p>
                  <p className="font-semibold text-white">{servicoSelecionado.prestador_nome}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Data de Criação</p>
                  <p className="font-semibold text-white">
                    {formatDateTime(servicoSelecionado.created_date)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Data Agendada</p>
                  <p className="font-semibold text-purple-400">
                    {formatDateTime(servicoSelecionado.data_agendamento)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Valor Total</p>
                  <p className="font-semibold text-green-400">{formatarMoeda(servicoSelecionado.valor_total)}</p>
                </div>
                {isPrestador && (
                  <div>
                    <p className="text-sm text-gray-500">Sua Comissão</p>
                    <p className="font-semibold text-green-400">{formatarMoeda(servicoSelecionado.comissao_prestador)}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Forma de Pagamento</p>
                  <Badge variant="outline" className="border-gray-600 text-gray-300">{servicoSelecionado.forma_pagamento}</Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <Badge className={statusColors[servicoSelecionado.status_servico]}>
                    {servicoSelecionado.status_servico}
                  </Badge>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-3">Itinerário Completo</p>
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
                          <p className="text-sm text-white">{end.endereco}</p>
                          {end.observacao && (
                            <p className="text-xs text-gray-400 mt-1">Obs: {end.observacao}</p>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {servicoSelecionado.observacao_geral && (
                <div>
                  <p className="text-sm text-gray-500">Observações Gerais</p>
                  <p className="text-sm text-white mt-1 bg-gray-700/50 p-3 rounded-lg border border-green-500/20">
                    {servicoSelecionado.observacao_geral}
                  </p>
                </div>
              )}

              <div className="flex justify-end">
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
