
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar as CalendarIcon, Eye, Search, DollarSign, CheckCircle, Package, TrendingUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ServicosConcluidos() {
  const [user, setUser] = useState(null);
  const [dialogDetalhes, setDialogDetalhes] = useState(false);
  const [servicoSelecionado, setServicoSelecionado] = useState(null);
  const [busca, setBusca] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

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
    queryFn: () => base44.entities.Servico.list('-data_conclusao'),
    enabled: !!user,
    refetchInterval: 5000 // ✅ Atualização automática
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list(),
    refetchInterval: 10000 // ✅ Atualização automática
  });

  const meusServicosConcluidos = servicos.filter(s => {
    if (!user?.prestador_id) return false;
    if (s.prestador_id !== user.prestador_id) return false;
    return s.status_servico === "Concluído";
  });

  const servicosFiltrados = meusServicosConcluidos.filter(s => {
    const matchBusca = !busca ||
      s.numero_pedido?.includes(busca) ||
      getClienteNome(s).toLowerCase().includes(busca.toLowerCase());

    if (dataInicio && dataFim) {
      const dataConclusao = new Date(s.data_conclusao || s.updated_date);
      const inicio = new Date(dataInicio);
      const fim = new Date(dataFim);
      // Adjust fim to include the whole day
      fim.setHours(23, 59, 59, 999);
      return matchBusca && dataConclusao >= inicio && dataConclusao <= fim;
    }

    return matchBusca;
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

  const totalServicos = servicosFiltrados.length;
  const valorTotal = servicosFiltrados.reduce((sum, s) => sum + (s.comissao_prestador || 0), 0);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4 md:p-8 space-y-6">
      <div>
        <h2 className="text-4xl font-bold text-white flex items-center gap-3">
          <CheckCircle className="w-10 h-10 text-green-500" />
          Serviços Concluídos
        </h2>
        <p className="text-gray-400 mt-2">Histórico de fretes realizados</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-2 border-green-500/30 bg-gradient-to-br from-green-500/10 to-emerald-500/10 hover:shadow-lg hover:shadow-green-500/20 transition-all">
          <CardHeader>
            <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
              <Package className="w-4 h-4 text-green-500" />
              Total de Serviços
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-green-400">{totalServicos}</div>
          </CardContent>
        </Card>

        <Card className="border-2 border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 hover:shadow-lg hover:shadow-cyan-500/20 transition-all">
          <CardHeader>
            <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-500" />
              Minhas Comissões
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-cyan-400">{formatarMoeda(valorTotal)}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-2 border-green-500/20 bg-gray-800/50 backdrop-blur shadow-xl">
        <CardHeader className="border-b border-green-500/20 bg-gray-800/30">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5 text-green-500" />
              <Input
                placeholder="Buscar por número ou cliente..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="flex-1 border-none bg-transparent focus-visible:ring-0 text-white placeholder:text-gray-500"
              />
            </div>

            <div className="flex gap-3 flex-wrap">
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
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
            </div>
          ) : servicosFiltrados.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500">Nenhum serviço concluído encontrado</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {servicosFiltrados.map((servico) => {
                const dataConclusao = servico.data_conclusao || servico.updated_date;

                return (
                  <Card
                    key={servico.id}
                    className="hover:shadow-xl transition-all cursor-pointer border-2 border-green-500/30 bg-gray-700/30 hover:bg-gray-700/50 hover:border-green-500/50"
                    onClick={() => visualizarDetalhes(servico)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className="bg-green-500/20 text-green-300 border-green-500/30 font-bold px-3 py-1">
                            #{servico.numero_pedido || servico.id.slice(-5).toUpperCase()}
                          </Badge>
                          <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Concluído
                          </Badge>
                          {servico.agendado && (
                            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                              <CalendarIcon className="w-3 h-3 mr-1" />
                              AGENDADO
                            </Badge>
                          )}
                        </div>
                      </div>
                      <CardTitle className="text-lg text-white">{getClienteNome(servico)}</CardTitle>
                      <p className="text-sm text-gray-400 mt-1 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        Concluído: {format(new Date(dataConclusao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </CardHeader>

                    <CardContent className="space-y-3">
                        {/* Todos os endereços na ordem */}
                        <div className="space-y-2">
                          {servico.enderecos && servico.enderecos.length > 0 ? (
                            servico.enderecos.map((end, idx) => (
                              <div key={idx} className="flex items-start gap-1">
                                <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                  end.tipo === "Coleta" ? "bg-blue-500" : "bg-green-500"
                                }`}>
                                  <MapPin className="w-2.5 h-2.5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] text-gray-500">{end.tipo}</p>
                                  <p className="text-xs font-medium text-white truncate">{end.endereco}</p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-gray-500">Sem endereços cadastrados</p>
                          )}
                        </div>

                      <div className="flex items-center justify-between pt-2 border-t border-green-500/20 bg-gradient-to-br from-green-500/10 to-emerald-500/5 p-3 rounded-lg">
                        <div>
                          <p className="text-xs text-gray-400">Valor do Serviço</p>
                          <p className="text-lg font-bold text-green-400">{formatarMoeda(servico.valor_total)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-400">Forma de Pgto</p>
                          <Badge variant="outline" className="text-xs border-green-500/30 text-green-400">{servico.forma_pagamento}</Badge>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-green-500/30 text-green-400 hover:bg-green-500/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          visualizarDetalhes(servico);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Ver Detalhes
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

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
                    {format(new Date(servicoSelecionado.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Data de Conclusão</p>
                  <p className="font-semibold text-green-400">
                    {format(new Date(servicoSelecionado.data_conclusao || servicoSelecionado.updated_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Valor Total</p>
                  <p className="font-semibold text-cyan-400">{formatarMoeda(servicoSelecionado.valor_total)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Sua Comissão</p>
                  <p className="font-semibold text-green-400">{formatarMoeda(servicoSelecionado.comissao_prestador)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Forma de Pagamento</p>
                  <Badge variant="outline" className="border-green-500/30 text-green-400">{servicoSelecionado.forma_pagamento}</Badge>
                </div>
              </div>

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
                  <p className="text-sm text-gray-400">Observações Gerais</p>
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
