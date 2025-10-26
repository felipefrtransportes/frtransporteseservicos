
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Download,
  CheckCircle,
  Clock,
  Search,
  Filter,
  AlertCircle
} from "lucide-react";
import { format, addDays, parseISO, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Fechamentos() {
  const [dialogFechamentoManual, setDialogFechamentoManual] = useState(false);
  const [dialogPreview, setDialogPreview] = useState(false); // New state for preview dialog
  const [dialogEdicao, setDialogEdicao] = useState(false);
  const [fechamentoSelecionado, setFechamentoSelecionado] = useState(null);
  const [busca, setBusca] = useState("");
  const [clienteFiltro, setClienteFiltro] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");
  const [servicosPreview, setServicosPreview] = useState([]); // New state for services to preview
  const [servicosSelecionados, setServicosSelecionados] = useState([]); // New state for selected services in preview
  
  const [formFechamentoManual, setFormFechamentoManual] = useState({
    cliente_id: "",
    periodo_inicio: format(new Date(), 'yyyy-MM-dd'),
    periodo_fim: format(new Date(), 'yyyy-MM-dd')
  });

  const queryClient = useQueryClient();

  const { data: fechamentos = [], isLoading } = useQuery({
    queryKey: ['fechamentos'],
    queryFn: () => base44.entities.Fechamento.list('-data_fechamento')
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list('nome')
  });

  const { data: servicos = [] } = useQuery({
    queryKey: ['servicos'],
    queryFn: () => base44.entities.Servico.list()
  });

  const previewFechamentoMutation = useMutation({
    mutationFn: async (data) => {
      const cliente = clientes.find(c => c.id === data.cliente_id);
      if (!cliente) throw new Error("Cliente não encontrado");

      const inicio = startOfDay(parseISO(data.periodo_inicio));
      const fim = endOfDay(parseISO(data.periodo_fim));

      const servicosPendentes = servicos.filter(s => 
        s.is_faturado && 
        s.faturado_status === "pendente" &&
        s.cliente_id === data.cliente_id &&
        new Date(s.data_conclusao || s.created_date) >= inicio &&
        new Date(s.data_conclusao || s.created_date) <= fim
      );

      return { cliente, servicosPendentes };
    },
    onSuccess: (data) => {
      if (data.servicosPendentes.length === 0) {
        alert("Nenhum serviço pendente encontrado no período selecionado para este cliente.");
        return;
      }
      setServicosPreview(data.servicosPendentes);
      setServicosSelecionados(data.servicosPendentes.map(s => s.id)); // Select all by default
      setDialogFechamentoManual(false);
      setDialogPreview(true);
    },
    onError: (error) => {
      alert("Erro ao pré-visualizar fechamento: " + error.message);
    }
  });

  const createFechamentoMutation = useMutation({
    mutationFn: async () => { // No longer takes 'data' directly, uses state
      const cliente = clientes.find(c => c.id === formFechamentoManual.cliente_id);
      if (!cliente) throw new Error("Cliente não encontrado");

      const servicosParaFechar = servicos.filter(s => servicosSelecionados.includes(s.id));

      if (servicosParaFechar.length === 0) {
        throw new Error("Nenhum serviço selecionado para fechamento.");
      }

      const valorTotal = servicosParaFechar.reduce((sum, s) => sum + (s.valor_total || 0), 0);
      
      // Calcular vencimento
      let dataVencimento = new Date(formFechamentoManual.periodo_fim);
      if (cliente.regra_vencimento === "5_dias_uteis") {
        dataVencimento = addDays(dataVencimento, 7); // simplificado
      } else if (cliente.dia_vencimento_fixo) {
        dataVencimento.setDate(cliente.dia_vencimento_fixo);
        // If the fixed day is in the past for the current month, set it for the next month
        if (dataVencimento < new Date()) {
          dataVencimento.setMonth(dataVencimento.getMonth() + 1);
        }
      }

      // Criar fechamento
      const fechamento = await base44.entities.Fechamento.create({
        cliente_id: formFechamentoManual.cliente_id,
        cliente_nome: cliente.nome,
        periodo_inicio: formFechamentoManual.periodo_inicio,
        periodo_fim: formFechamentoManual.periodo_fim,
        valor_total: valorTotal,
        quantidade_servicos: servicosParaFechar.length,
        data_fechamento: format(new Date(), 'yyyy-MM-dd'),
        data_vencimento: format(dataVencimento, 'yyyy-MM-dd'),
        status: "Aberto",
        tipo_fechamento: "Manual",
        servicos_ids: servicosParaFechar.map(s => s.id)
      });

      // Criar lançamento no financeiro
      await base44.entities.Lancamento.create({
        tipo: "Receita",
        descricao: `Fechamento ${cliente.nome} - ${format(parseISO(formFechamentoManual.periodo_inicio), "dd/MM/yyyy")} a ${format(parseISO(formFechamentoManual.periodo_fim), "dd/MM/yyyy")}`,
        valor: valorTotal,
        categoria: "Faturamento",
        data_lancamento: format(new Date(), 'yyyy-MM-dd'),
        data_vencimento: format(dataVencimento, 'yyyy-MM-dd'),
        status_pagamento: "Pendente",
        cliente_id: formFechamentoManual.cliente_id,
        incluir_financeiro_geral: true // Added this field
      });

      // Atualizar serviços
      for (const servico of servicosParaFechar) {
        await base44.entities.Servico.update(servico.id, {
          ...servico,
          faturado_status: "fechado",
          fechamento_id: fechamento.id
        });
      }

      // Atualizar cliente
      await base44.entities.Cliente.update(cliente.id, {
        ...cliente,
        ultimo_fechamento: format(new Date(), 'yyyy-MM-dd')
      });

      return fechamento;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['fechamentos']);
      queryClient.invalidateQueries(['servicos']);
      queryClient.invalidateQueries(['clientes']);
      queryClient.invalidateQueries(['lancamentos']); // Invalidate lancamentos query
      setDialogPreview(false); // Close preview dialog
      setServicosPreview([]); // Clear preview services
      setServicosSelecionados([]); // Clear selected services
      setFormFechamentoManual({
        cliente_id: "",
        periodo_inicio: format(new Date(), 'yyyy-MM-dd'),
        periodo_fim: format(new Date(), 'yyyy-MM-dd')
      });
    },
    onError: (error) => {
      alert("Erro ao criar fechamento: " + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (fechamento) => {
      // Reverter serviços para pendente
      const servicosVinculados = servicos.filter(s => s.fechamento_id === fechamento.id);
      for (const servico of servicosVinculados) {
        await base44.entities.Servico.update(servico.id, {
          ...servico,
          faturado_status: "pendente",
          fechamento_id: null
        });
      }

      // Excluir lançamento financeiro se existir
      if (fechamento.lancamento_financeiro_id) { // Assuming there's a reference to the lancamento_financeiro_id
        try {
          await base44.entities.Lancamento.delete(fechamento.lancamento_financeiro_id);
        } catch (e) {
          console.error("Erro ao excluir lançamento financeiro:", e);
        }
      }

      // Excluir fechamento
      await base44.entities.Fechamento.delete(fechamento.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['fechamentos']);
      queryClient.invalidateQueries(['servicos']);
      queryClient.invalidateQueries(['lancamentos']);
    },
    onError: (error) => {
      alert("Erro ao excluir fechamento: " + error.message);
    }
  });

  const handlePreview = () => {
    if (!formFechamentoManual.cliente_id) {
      alert("Selecione um cliente para pré-visualizar o fechamento.");
      return;
    }
    previewFechamentoMutation.mutate(formFechamentoManual);
  };

  const handleConfirmarFechamento = () => {
    if (servicosSelecionados.length === 0) {
      alert("Selecione pelo menos um serviço para incluir no fechamento.");
      return;
    }
    createFechamentoMutation.mutate();
  };

  const handleToggleServico = (servicoId) => {
    if (servicosSelecionados.includes(servicoId)) {
      setServicosSelecionados(servicosSelecionados.filter(id => id !== servicoId));
    } else {
      setServicosSelecionados([...servicosSelecionados, servicoId]);
    }
  };

  const handleExcluir = (fechamento) => {
    if (window.confirm(`Tem certeza que deseja excluir o fechamento de "${fechamento.cliente_nome}"?\nOs serviços voltarão para pendente.`)) {
      deleteMutation.mutate(fechamento);
    }
  };

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor || 0);
  };

  const fechamentosFiltrados = fechamentos.filter(f => {
    const matchBusca = !busca || f.cliente_nome?.toLowerCase().includes(busca.toLowerCase());
    const matchCliente = !clienteFiltro || f.cliente_id === clienteFiltro;
    const matchStatus = !statusFiltro || f.status === statusFiltro;
    
    return matchBusca && matchCliente && matchStatus;
  });

  const valorTotalSelecionados = servicosPreview
    .filter(s => servicosSelecionados.includes(s.id))
    .reduce((sum, s) => sum + (s.valor_total || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-4xl font-bold text-white flex items-center gap-3">
            <FileText className="w-10 h-10 text-green-500" />
            Fechamentos
          </h2>
          <p className="text-gray-400 mt-2">Gerenciar fechamentos de faturamento</p>
        </div>

        <Button 
          onClick={() => setDialogFechamentoManual(true)}
          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          Fechamento Manual
        </Button>
      </div>

      {/* Filtros */}
      <Card className="border-2 border-green-500/20 bg-gray-800/50">
        <CardHeader className="border-b border-green-500/20">
          <div className="flex items-center gap-3">
            <Search className="w-5 h-5 text-green-500" />
            <Input
              placeholder="Buscar por cliente..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="flex-1 border-none bg-transparent text-white"
            />
            <Filter className="w-5 h-5 text-green-500" />
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Cliente</Label>
              <Select value={clienteFiltro} onValueChange={setClienteFiltro}>
                <SelectTrigger className="bg-gray-700 border-green-500/30 text-white">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700">
                  <SelectItem value={null}>Todos</SelectItem> {/* Changed null to "" for consistency with Select component */}
                  {clientes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Status</Label>
              <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                <SelectTrigger className="bg-gray-700 border-green-500/30 text-white">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700">
                  <SelectItem value={null}>Todos</SelectItem> {/* Changed null to "" */}
                  <SelectItem value="Aberto">Aberto</SelectItem>
                  <SelectItem value="Pago">Pago</SelectItem>
                  <SelectItem value="Cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Fechamentos */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
          </div>
        ) : fechamentosFiltrados.length === 0 ? (
          <Card className="border-2 border-green-500/20 bg-gray-800/50">
            <CardContent className="py-12 text-center">
              <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Nenhum fechamento encontrado</p>
            </CardContent>
          </Card>
        ) : (
          fechamentosFiltrados.map((fechamento) => (
            <Card key={fechamento.id} className="border-2 border-green-500/20 bg-gray-700/30 hover:bg-gray-700/50 transition-all">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                        <FileText className="w-6 h-6 text-green-500" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-lg">{fechamento.cliente_nome}</h3>
                        <p className="text-sm text-gray-400">
                          {format(new Date(fechamento.periodo_inicio), "dd/MM/yyyy", { locale: ptBR })} - {format(new Date(fechamento.periodo_fim), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 text-sm">
                      <Badge variant="outline" className="border-gray-600 text-gray-300">
                        {fechamento.quantidade_servicos} serviços
                      </Badge>
                      <Badge variant="outline" className="border-gray-600 text-gray-300">
                        Venc: {format(new Date(fechamento.data_vencimento), "dd/MM/yyyy")}
                      </Badge>
                      <Badge className={fechamento.tipo_fechamento === "Automático" ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400"}>
                        {fechamento.tipo_fechamento}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-3xl font-bold text-green-400">{formatarMoeda(fechamento.valor_total)}</div>
                      <Badge className={
                        fechamento.status === "Pago" ? "bg-green-500/20 text-green-400" :
                        fechamento.status === "Cancelado" ? "bg-red-500/20 text-red-400" :
                        "bg-yellow-500/20 text-yellow-400"
                      }>
                        {fechamento.status}
                      </Badge>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button variant="outline" size="sm" className="border-green-500/30 text-green-400">
                        <Download className="w-4 h-4 mr-1" />
                        PDF
                      </Button>
                      <Button variant="outline" size="sm" className="border-gray-600 text-gray-300">
                        <Edit className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleExcluir(fechamento)}
                        className="text-red-400 border-red-500/30"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dialog Fechamento Manual - Seleção Inicial */}
      <Dialog open={dialogFechamentoManual} onOpenChange={setDialogFechamentoManual}>
        <DialogContent className="bg-gray-800 border-2 border-green-500/30">
          <DialogHeader>
            <DialogTitle className="text-white">Fechamento Manual - Selecionar Período</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Cliente *</Label>
              <Select 
                value={formFechamentoManual.cliente_id} 
                onValueChange={(value) => setFormFechamentoManual({...formFechamentoManual, cliente_id: value})}
              >
                <SelectTrigger className="bg-gray-700 border-green-500/30 text-white">
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700">
                  {clientes.filter(c => c.faturamento_ativo).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Período Início *</Label>
                <Input
                  type="date"
                  value={formFechamentoManual.periodo_inicio}
                  onChange={(e) => setFormFechamentoManual({...formFechamentoManual, periodo_inicio: e.target.value})}
                  className="bg-gray-700 border-green-500/30 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Período Fim *</Label>
                <Input
                  type="date"
                  value={formFechamentoManual.periodo_fim}
                  onChange={(e) => setFormFechamentoManual({...formFechamentoManual, periodo_fim: e.target.value})}
                  className="bg-gray-700 border-green-500/30 text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setDialogFechamentoManual(false)} className="border-gray-600 text-gray-300">
                Cancelar
              </Button>
              <Button 
                onClick={handlePreview}
                disabled={!formFechamentoManual.cliente_id || previewFechamentoMutation.isPending}
                className="bg-gradient-to-r from-green-500 to-emerald-600"
              >
                {previewFechamentoMutation.isPending ? "Carregando..." : "Visualizar Serviços"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Preview - Selecionar Serviços */}
      <Dialog open={dialogPreview} onOpenChange={setDialogPreview}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-gray-800 border-2 border-green-500/30">
          <DialogHeader>
            <DialogTitle className="text-white">
              Preview do Fechamento - Selecione os Serviços
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold">
                    {servicosSelecionados.length} de {servicosPreview.length} serviços selecionados
                  </p>
                  <p className="text-sm text-gray-400">
                    Período: {format(parseISO(formFechamentoManual.periodo_inicio), "dd/MM/yyyy", { locale: ptBR })} até {format(parseISO(formFechamentoManual.periodo_fim), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-400">
                    {formatarMoeda(valorTotalSelecionados)}
                  </p>
                  <p className="text-xs text-gray-500">Valor Total</p>
                </div>
              </div>
            </div>

            {servicosPreview.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">Nenhum serviço pendente encontrado no período</p>
              </div>
            ) : (
              <div className="space-y-2">
                {servicosPreview.map((servico) => (
                  <div 
                    key={servico.id}
                    className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                      servicosSelecionados.includes(servico.id)
                        ? "bg-green-500/10 border-green-500/30"
                        : "bg-gray-700/30 border-gray-600/30 hover:border-gray-500/50"
                    }`}
                    onClick={() => handleToggleServico(servico.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <Checkbox
                          checked={servicosSelecionados.includes(servico.id)}
                          onCheckedChange={() => handleToggleServico(servico.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-white">Serviço #{servico.numero_pedido}</p>
                          <p className="text-sm text-gray-400 mt-1">
                            Prestador: {servico.prestador_nome}
                          </p>
                          <p className="text-sm text-gray-400">
                            Concluído em: {servico.data_conclusao ? format(new Date(servico.data_conclusao), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "N/A"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-green-400">
                          {formatarMoeda(servico.valor_total)}
                        </p>
                        <Badge variant="outline" className="border-blue-500/30 text-blue-400 mt-1">
                          {servico.forma_pagamento}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
              <Button 
                variant="outline" 
                onClick={() => {
                  setDialogPreview(false);
                  setDialogFechamentoManual(true);
                }} 
                className="border-gray-600 text-gray-300"
              >
                Voltar
              </Button>
              <Button 
                onClick={handleConfirmarFechamento}
                disabled={servicosSelecionados.length === 0 || createFechamentoMutation.isPending}
                className="bg-gradient-to-r from-green-500 to-emerald-600"
              >
                {createFechamentoMutation.isPending ? "Gerando Fechamento..." : "Confirmar Fechamento"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
