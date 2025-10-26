import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, MapPin, User, Calendar as CalendarIcon, Eye, Edit, Trash2, Search, Filter, DollarSign, CreditCard, Clock, CheckCircle2, XCircle, AlertTriangle, FileText, Package, Truck, AlertCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime, formatDateShort, formatDateTimeFull } from "@/components/utils/dateUtils";

import ServicoDialog from "../components/servicos/ServicoDialog";
import EditarAgendamentoDialog from "../components/servicos/EditarAgendamentoDialog";

export default function Servicos() {
  const [dialogAberto, setDialogAberto] = useState(false);
  const [dialogDetalhes, setDialogDetalhes] = useState(false);
  const [dialogAgendamento, setDialogAgendamento] = useState(false);
  const [servicoSelecionado, setServicoSelecionado] = useState(null);
  const [servicoEdicao, setServicoEdicao] = useState(null);
  const [busca, setBusca] = useState("");
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtros, setFiltros] = useState({
    dataInicio: "",
    dataFim: "",
    statusServico: "",
    formaPagamento: "",
    clienteId: "",
    prestadorId: ""
  });
  const [mostrarBotaoTopo, setMostrarBotaoTopo] = useState(false);
  
  const [dialogResumo, setDialogResumo] = useState(false);
  const [servicosResumo, setServicosResumo] = useState([]);
  const [tituloResumo, setTituloResumo] = useState("");

  const [dialogCancelar, setDialogCancelar] = useState(false);
  const [servicoParaCancelar, setServicoParaCancelar] = useState(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState("");

  const queryClient = useQueryClient();

  const { data: servicos = [], isLoading } = useQuery({
    queryKey: ['servicos'],
    queryFn: async () => {
      try {
        return await base44.entities.Servico.list('-created_date');
      } catch (error) {
        console.error("Erro ao carregar serviços:", error);
        return [];
      }
    }
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

  const { data: prestadores = [] } = useQuery({
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

  const { data: fechamentos = [] } = useQuery({
    queryKey: ['fechamentos'],
    queryFn: async () => {
      try {
        return await base44.entities.Fechamento.list();
      } catch (error) {
        console.error("Erro ao carregar fechamentos:", error);
        return [];
      }
    }
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setMostrarBotaoTopo(true);
      } else {
        setMostrarBotaoTopo(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const voltarAoTopo = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getClienteNome = (servico, clientsList = clientes) => {
    if (servico.cliente_nome_avulso) return servico.cliente_nome_avulso;
    const cliente = clientsList.find(c => c.id === servico.cliente_id);
    return cliente ? cliente.nome : "Cliente não encontrado";
  };

  const getPrestadorNome = (servico, prestadoresList = prestadores) => {
    const prestador = prestadoresList.find(p => p.id === servico.prestador_id);
    return prestador ? prestador.nome : "Prestador não encontrado";
  };

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor || 0);
  };

  const servicosFiltrados = servicos.filter(servico => {
    const matchBusca = !busca || 
      servico.numero_pedido?.includes(busca) ||
      getClienteNome(servico).toLowerCase().includes(busca.toLowerCase()) ||
      getPrestadorNome(servico).toLowerCase().includes(busca.toLowerCase()) ||
      servico.status_servico?.toLowerCase().includes(busca.toLowerCase());
    
    const matchDataInicio = !filtros.dataInicio || new Date(servico.created_date) >= new Date(filtros.dataInicio + 'T00:00:00');
    const matchDataFim = !filtros.dataFim || new Date(servico.created_date) <= new Date(filtros.dataFim + 'T23:59:59');
    const matchStatus = !filtros.statusServico || servico.status_servico === filtros.statusServico;
    const matchPagamento = !filtros.formaPagamento || servico.forma_pagamento === filtros.formaPagamento;
    const matchCliente = !filtros.clienteId || servico.cliente_id === filtros.clienteId;
    const matchPrestador = !filtros.prestadorId || servico.prestador_id === filtros.prestadorId;
    
    return matchBusca && matchDataInicio && matchDataFim && matchStatus && matchPagamento && matchCliente && matchPrestador;
  });

  const servicosOrdenados = [...servicosFiltrados].sort((a, b) => {
    const ordemStatus = {
      "Aguardando Aceitação": 1,
      "Aceito": 2,
      "Coletado": 3,
      "Atrasado": 4,
      "Recusado": 5,
      "Cancelado": 6,
      "Concluído": 7
    };

    const prioridadeA = ordemStatus[a.status_servico] || 99;
    const prioridadeB = ordemStatus[b.status_servico] || 99;

    if (prioridadeA !== prioridadeB) {
      return prioridadeA - prioridadeB;
    }

    return new Date(b.created_date) - new Date(a.created_date);
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-4xl font-bold text-white flex items-center gap-3">
            <DollarSign className="w-10 h-10 text-green-500" />
            Serviços
          </h2>
          <p className="text-gray-400 mt-2">Gerencie todos os fretes e entregas</p>
        </div>
        <Button 
          onClick={() => { setServicoEdicao(null); setDialogAberto(true); }}
          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-green-500/50"
        >
          <Plus className="w-5 h-5 mr-2" />
          Novo Serviço
        </Button>
      </div>

      <Card className="border-2 border-green-500/20 bg-gray-800/50 backdrop-blur shadow-xl">
        <CardHeader className="border-b border-green-500/20 bg-gray-800/30">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5 text-green-500" />
              <Input
                placeholder="Buscar por número, cliente, prestador ou status..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="flex-1 border-none bg-transparent focus-visible:ring-0 text-white placeholder:text-gray-500"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMostrarFiltros(!mostrarFiltros)}
                className="gap-2 border-green-500/30 text-green-400 hover:bg-green-500/10"
              >
                <Filter className="w-4 h-4" />
                Filtros
              </Button>
            </div>

            {mostrarFiltros && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-green-500/20">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-400">Data Início</Label>
                  <Input
                    type="date"
                    value={filtros.dataInicio}
                    onChange={(e) => setFiltros({...filtros, dataInicio: e.target.value})}
                    className="bg-gray-700 border-green-500/30 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-400">Data Fim</Label>
                  <Input
                    type="date"
                    value={filtros.dataFim}
                    onChange={(e) => setFiltros({...filtros, dataFim: e.target.value})}
                    className="bg-gray-700 border-green-500/30 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-400">Status do Serviço</Label>
                  <Select value={filtros.statusServico} onValueChange={(value) => setFiltros({...filtros, statusServico: value})}>
                    <SelectTrigger className="bg-gray-700 border-green-500/30 text-white">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-green-500/30">
                      <SelectItem value={null}>Todos</SelectItem>
                      <SelectItem value="Aguardando Aceitação">Aguardando Aceitação</SelectItem>
                      <SelectItem value="Aceito">Aceito</SelectItem>
                      <SelectItem value="Coletado">Coletado</SelectItem>
                      <SelectItem value="Concluído">Concluído</SelectItem>
                      <SelectItem value="Cancelado">Cancelado</SelectItem>
                      <SelectItem value="Recusado">Recusado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
            </div>
          ) : servicosOrdenados.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500">Nenhum serviço encontrado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {servicosOrdenados.map((servico) => {
                const isCancelado = servico.status_servico === "Cancelado";
                return (
                  <Card
                    key={servico.id}
                    className={`border-2 ${
                      isCancelado ? 'border-gray-500/20 bg-gray-700/20 opacity-75' : 'border-green-500/20 bg-gray-700/30'
                    } hover:shadow-lg transition-all`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-20 h-20 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0 ${
                          isCancelado 
                            ? 'bg-gradient-to-br from-gray-600 to-gray-700' 
                            : 'bg-gradient-to-br from-green-500 to-emerald-600'
                        }`}>
                          <div className="text-center">
                            <div className="text-[10px] text-white/80 font-semibold">OS</div>
                            <div className="text-lg font-bold text-white leading-tight">#{servico.numero_pedido || servico.id.slice(-5).toUpperCase()}</div>
                          </div>
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={`${
                              servico.status_servico === "Cancelado" ? 'bg-gray-500/20 text-red-400 border-gray-500/30' :
                              servico.status_servico === "Concluído" ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                              'bg-blue-500/20 text-blue-400 border-blue-500/30'
                            } font-bold px-3 py-1 text-sm`}>
                              {servico.status_servico}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <div className="flex items-center gap-1 mb-1">
                                <User className="w-3 h-3 text-gray-500" />
                                <p className="text-xs text-gray-500">Cliente</p>
                              </div>
                              <p className="font-bold text-white text-sm">{getClienteNome(servico)}</p>
                            </div>

                            <div>
                              <div className="flex items-center gap-1 mb-1">
                                <Truck className="w-3 h-3 text-gray-500" />
                                <p className="text-xs text-gray-500">Prestador</p>
                              </div>
                              <p className="font-bold text-white text-sm">{getPrestadorNome(servico)}</p>
                            </div>

                            <div className="text-right">
                              <p className="text-xs text-gray-500 mb-1">Valor</p>
                              {isCancelado ? (
                                <p className="text-xl font-bold text-gray-500 line-through">{formatarMoeda(servico.valor_original || 0)}</p>
                              ) : (
                                <p className="text-xl font-bold text-green-400">{formatarMoeda(servico.valor_total)}</p>
                              )}
                            </div>
                          </div>

                          {servico.motivo_cancelamento && isCancelado && (
                            <div className="mt-2 text-xs text-gray-400 bg-gray-500/10 px-2 py-1 rounded border border-gray-500/30">
                              <strong>Cancelado:</strong> {servico.motivo_cancelamento}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2">
                          <Button
                            onClick={() => { setServicoEdicao(servico); setDialogAberto(true); }}
                            variant="outline"
                            size="sm"
                            className="border-gray-600 text-gray-300 hover:bg-gray-700 h-7 px-2"
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Editar
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className="border-gray-600 text-gray-300 hover:bg-gray-700 h-7 px-2"
                            onClick={() => {
                              setServicoSelecionado(servico);
                              setDialogDetalhes(true);
                            }}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Ver
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ServicoDialog
        aberto={dialogAberto}
        setAberto={(value) => {
          setDialogAberto(value);
          if (!value) {
            setServicoEdicao(null);
          }
        }}
        servicoEdicao={servicoEdicao}
      />

      <Dialog open={dialogDetalhes} onOpenChange={setDialogDetalhes}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-gray-800 border-2 border-green-500/30">
          <DialogHeader>
            <DialogTitle className="text-white">Detalhes do Serviço #{servicoSelecionado?.numero_pedido}</DialogTitle>
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
                  <p className="font-semibold text-white">{getPrestadorNome(servicoSelecionado)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Valor Total</p>
                  <p className="font-semibold text-green-400">{formatarMoeda(servicoSelecionado.valor_total)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <Badge>{servicoSelecionado.status_servico}</Badge>
                </div>
              </div>

              {servicoSelecionado.motivo_cancelamento && (
                <div>
                  <p className="text-sm text-gray-500">Motivo do Cancelamento</p>
                  <p className="text-sm text-gray-400 mt-1 bg-gray-500/10 p-3 rounded-lg border border-gray-500/30">
                    {servicoSelecionado.motivo_cancelamento}
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setDialogDetalhes(false)} className="border-gray-600 text-gray-300 hover:bg-gray-700">
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {mostrarBotaoTopo && (
        <button
          onClick={voltarAoTopo}
          className="fixed bottom-8 right-8 z-50 w-14 h-14 bg-gray-800 hover:bg-gray-700 text-white rounded-full shadow-xl flex items-center justify-center transition-all"
        >
          ↑
        </button>
      )}
    </div>
  );
}