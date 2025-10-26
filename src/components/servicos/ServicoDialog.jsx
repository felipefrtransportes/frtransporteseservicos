
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, MapPin, Truck, User, DollarSign, Calendar, Package, Clock, Gauge, Car } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { fromInputDateTimeToISO } from "@/components/utils/dateUtils";
import { format } from 'date-fns';

// Utility to convert ISO date-time string to input[type="datetime-local"] format
const toInputDateTime = (isoString) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// ✅ Função para obter próximo número de OS (sequencial e sem reutilização)
const obterProximoNumero = async () => {
  try {
    const todosServicos = await base44.entities.Servico.list();
    
    if (todosServicos.length === 0) {
      return "00001";
    }
    
    // Extrair todos os números já utilizados
    const numerosUsados = todosServicos
      .map(s => s.numero_pedido || "")
      .filter(n => n.match(/^\d+$/)) // Only consider purely numeric service numbers
      .map(n => parseInt(n, 10))
      .filter(n => n > 0);
    
    // Encontrar o maior número já utilizado
    const maiorNumero = numerosUsados.length > 0 
      ? Math.max(...numerosUsados)
      : 0;
    
    // Próximo número é sempre maior número + 1
    const proximoNumero = maiorNumero + 1;
    
    // Formatar com 5 dígitos
    return proximoNumero.toString().padStart(5, '0');
  } catch (error) {
    console.error("Erro ao obter próximo número:", error);
    // Em caso de erro, usar timestamp como fallback (menos robusto, mas evita bloqueio)
    return Date.now().toString().slice(-5);
  }
};


export default function ServicoDialog({ aberto, setAberto, servicoEdicao = null }) {
  const [etapa, setEtapa] = useState(1);
  const [formData, setFormData] = useState({
    cliente_id: "",
    cliente_nome_avulso: "",
    prestador_id: "",
    valor_total: 0,
    forma_pagamento: "PIX",
    enderecos: [
      { tipo: "Coleta", endereco: "", observacao: "" },
      { tipo: "Entrega", endereco: "", observacao: "" }
    ],
    agendado: false,
    data_agendamento: "",
    urgente: false,
    observacao_geral: "",
    tipo_veiculo: "",
    distancia_km: null,
    tempo_estimado: ""
  });

  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);

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

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list('nome')
  });

  const { data: prestadores = [] } = useQuery({
    queryKey: ['prestadores'],
    queryFn: () => base44.entities.Prestador.list('nome')
  });

  // ✅ Carregar dados do serviço quando for edição
  useEffect(() => {
    if (aberto) { // Only set form data if dialog is open
      if (servicoEdicao) {
        setFormData({
          cliente_id: servicoEdicao.cliente_id || "",
          cliente_nome_avulso: servicoEdicao.cliente_nome_avulso || "",
          prestador_id: servicoEdicao.prestador_id || "",
          valor_total: servicoEdicao.valor_total || 0,
          forma_pagamento: servicoEdicao.forma_pagamento || "PIX",
          enderecos: servicoEdicao.enderecos && servicoEdicao.enderecos.length > 0
            ? servicoEdicao.enderecos
            : [
                { tipo: "Coleta", endereco: "", observacao: "" },
                { tipo: "Entrega", endereco: "", observacao: "" }
              ],
          agendado: servicoEdicao.agendado || false,
          data_agendamento: servicoEdicao.data_agendamento ? toInputDateTime(servicoEdicao.data_agendamento) : "",
          urgente: servicoEdicao.urgente || false,
          observacao_geral: servicoEdicao.observacao_geral || "",
          tipo_veiculo: servicoEdicao.tipo_veiculo || "",
          distancia_km: servicoEdicao.distancia_km || null,
          tempo_estimado: servicoEdicao.tempo_estimado || ""
        });
        setEtapa(1); // Começar na primeira etapa
      } else {
        // Reset para novo serviço
        setFormData({
          cliente_id: "",
          cliente_nome_avulso: "",
          prestador_id: "",
          valor_total: 0,
          forma_pagamento: "PIX",
          enderecos: [
            { tipo: "Coleta", endereco: "", observacao: "" },
            { tipo: "Entrega", endereco: "", observacao: "" }
          ],
          agendado: false,
          data_agendamento: "",
          urgente: false,
          observacao_geral: "",
          tipo_veiculo: "",
          distancia_km: null,
          tempo_estimado: ""
        });
        setEtapa(1);
      }
    }
  }, [servicoEdicao, aberto]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      try {
        const currentUser = await base44.auth.me();

        // Convert data_agendamento from datetime-local to ISO if present
        const dataAgendamentoISO = data.agendado && data.data_agendamento
          ? fromInputDateTimeToISO(data.data_agendamento)
          : null;
        const payload = { ...data, data_agendamento: dataAgendamentoISO };

        // ✅ Se for edição, atualizar
        if (servicoEdicao) {
          const agora = new Date().toISOString();

          // Recalcular comissão
          const prestador = prestadores.find(p => p.id === payload.prestador_id);
          if (prestador) {
            payload.comissao_prestador = (payload.valor_total * prestador.comissao_percentual) / 100;
          }

          // Determinar se é faturado
          const isFaturado = payload.forma_pagamento === "Faturado (Notinha)" || payload.forma_pagamento === "Faturado (Planilha)";
          payload.is_faturado = isFaturado;

          // Se deixou de ser faturado, limpar campos relacionados
          if (!isFaturado && servicoEdicao.faturado_status) {
            payload.faturado_status = null;
            payload.fechamento_id = null;
          }

          // Registrar alteração
          payload.alterado_por_nome = currentUser?.full_name || "Administrador";
          payload.alterado_por_email = currentUser?.email || "admin@fr.com";
          payload.data_alteracao = agora;

          const servico = await base44.entities.Servico.update(servicoEdicao.id, payload);

          // Atualizar lançamentos financeiros se valor mudou ou tipo de pagamento
          if (servicoEdicao.valor_total !== payload.valor_total || servicoEdicao.forma_pagamento !== payload.forma_pagamento) {
            try {
              const lancamentos = await base44.entities.Lancamento.filter({ servico_id: servicoEdicao.id });
              if (lancamentos.length > 0) {
                // Determine new status based on form of payment
                const newStatusPagamento = (isFaturado || payload.forma_pagamento === "PIX") ? "Pendente" : "Recebido";
                
                await base44.entities.Lancamento.update(lancamentos[0].id, {
                  valor: payload.valor_total,
                  status_pagamento: newStatusPagamento
                });
              }

              const lancamentosPrest = await base44.entities.LancamentoPrestador.filter({ servico_id: servicoEdicao.id });
              if (lancamentosPrest.length > 0 && payload.comissao_prestador) {
                await base44.entities.LancamentoPrestador.update(lancamentosPrest[0].id, {
                  valor: payload.comissao_prestador
                });
              }
            } catch (error) {
              console.error("Erro ao atualizar lançamentos:", error);
            }
          }

          return servico;
        }

        // ✅ Se for criação, criar novo com número sequencial único
        const proximoNumero = await obterProximoNumero();
        console.log(`📋 Próximo número de OS: ${proximoNumero}`);
        
        payload.numero_pedido = proximoNumero;
        payload.status_servico = "Aguardando Aceitação"; // Default status for new
        
        // Define status de pagamento inicial
        const isFaturado = payload.forma_pagamento === "Faturado (Notinha)" || payload.forma_pagamento === "Faturado (Planilha)";
        const statusPagamentoInicial = (isFaturado || payload.forma_pagamento === "PIX") ? "Pendente" : "Pago";
        payload.status_pagamento = statusPagamentoInicial;

        // Calcular comissão
        const prestador = prestadores.find(p => p.id === payload.prestador_id);
        if (prestador) {
          payload.comissao_prestador = (payload.valor_total * prestador.comissao_percentual) / 100;
          payload.prestador_nome = prestador.nome; // Also store prestador name
        }

        // Adicionar informações do criador
        payload.criado_por_nome = currentUser?.full_name || "Administrador";
        payload.criado_por_email = currentUser?.email || "admin@fr.com";

        // Determinar se é faturado
        payload.is_faturado = isFaturado;
        if (isFaturado) {
          payload.faturado_status = "pendente";
        }

        const servico = await base44.entities.Servico.create(payload);
        console.log(`✅ Serviço criado com OS #${proximoNumero}`);

        // Criar lançamento financeiro
        // Faturados só entram no financeiro quando o fechamento for feito
        if (!isFaturado) {
          try {
            await base44.entities.Lancamento.create({
              tipo: "Receita",
              descricao: `Serviço #${proximoNumero} - ${payload.cliente_nome_avulso || clientes.find(c => c.id === payload.cliente_id)?.nome || "Cliente"}`,
              valor: payload.valor_total,
              categoria: "Serviços",
              data_lancamento: format(new Date(), 'yyyy-MM-dd'),
              data_vencimento: format(new Date(), 'yyyy-MM-dd'),
              status_pagamento: statusPagamentoInicial, // Use the determined status
              servico_id: servico.id,
              cliente_id: payload.cliente_id || null,
              incluir_financeiro_geral: true
            });
          } catch (error) {
            console.error("Erro ao criar lançamento financeiro:", error);
          }
        }

        // Criar lançamento do prestador (sempre, independente de ser faturado)
        if (payload.comissao_prestador) {
          try {
            await base44.entities.LancamentoPrestador.create({
              prestador_id: payload.prestador_id,
              prestador_nome: prestador?.nome || "",
              tipo: "Comissão",
              descricao: `Comissão - Serviço #${proximoNumero}`,
              valor: payload.comissao_prestador,
              data_lancamento: format(new Date(), 'yyyy-MM-dd'),
              data_vencimento: format(new Date(), 'yyyy-MM-dd'),
              status_pagamento: "Pago", // Comissão sempre como PAGA para o prestador
              servico_id: servico.id,
              incluir_financeiro_geral: false
            });
          } catch (error) {
            console.error("Erro ao criar lançamento do prestador:", error);
          }
        }

        return servico;
      } catch (error) {
        console.error("Erro ao processar serviço:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicos'] });
      queryClient.invalidateQueries({ queryKey: ['lancamentos'] });
      queryClient.invalidateQueries({ queryKey: ['lancamentosprestador'] });
      setAberto(false);
      setEtapa(1); // Reset step
      // ✅ Removido o alert de sucesso
    },
    onError: (error) => {
      alert(`❌ Erro ao ${servicoEdicao ? 'atualizar' : 'criar'} serviço: ` + error.message);
    }
  });

  const resetForm = () => {
    setFormData({
      cliente_id: "",
      cliente_nome_avulso: "",
      prestador_id: "",
      valor_total: 0,
      forma_pagamento: "PIX",
      enderecos: [
        { tipo: "Coleta", endereco: "", observacao: "" },
        { tipo: "Entrega", endereco: "", observacao: "" }
      ],
      agendado: false,
      data_agendamento: "",
      urgente: false,
      observacao_geral: "",
      tipo_veiculo: "",
      distancia_km: null,
      tempo_estimado: ""
    });
  };

  const adicionarEndereco = () => {
    setFormData({
      ...formData,
      enderecos: [...formData.enderecos, { tipo: "Entrega", endereco: "", observacao: "" }]
    });
  };

  const removerEndereco = (index) => {
    const novosEnderecos = formData.enderecos.filter((_, i) => i !== index);
    setFormData({ ...formData, enderecos: novosEnderecos });
  };

  const atualizarEndereco = (index, campo, valor) => {
    const novosEnderecos = [...formData.enderecos];
    novosEnderecos[index][campo] = valor;
    setFormData({ ...formData, enderecos: novosEnderecos });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleFechar = () => {
    setAberto(false);
    setEtapa(1); // Reset step when closing
  };

  return (
    <Dialog open={aberto} onOpenChange={handleFechar}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-800 border-2 border-green-500/30">
        <DialogHeader className="border-b border-green-500/20 pb-4">
          <DialogTitle className="text-white flex items-center gap-2 text-2xl">
            <Package className="w-6 h-6 text-green-500" />
            {servicoEdicao ? `Editar Serviço #${servicoEdicao.numero_pedido || (servicoEdicao.id ? servicoEdicao.id.slice(-5).toUpperCase() : '')}` : 'Novo Serviço'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações do Cliente */}
          <div className="space-y-4 bg-gray-700/30 p-4 rounded-lg border border-green-500/20">
            <h3 className="font-semibold text-lg flex items-center gap-2 text-white">
              <Badge className="bg-green-500 text-white">1</Badge>
              <User className="w-5 h-5 text-green-500" />
              Informações do Cliente
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Cliente Cadastrado</Label>
                <Select
                  value={formData.cliente_id}
                  onValueChange={(value) => setFormData({...formData, cliente_id: value, cliente_nome_avulso: ""})}
                  disabled={!!servicoEdicao} // Disable cliente selection if editing existing service
                >
                  <SelectTrigger className="bg-gray-700 border-green-500/30 text-white focus:border-green-500">
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-green-500/30">
                    <SelectItem value={null}>Nenhum (Cliente Avulso)</SelectItem>
                    {clientes.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Ou Nome Avulso</Label>
                <Input
                  value={formData.cliente_nome_avulso}
                  onChange={(e) => setFormData({...formData, cliente_nome_avulso: e.target.value, cliente_id: ""})}
                  placeholder="Digite o nome do cliente"
                  disabled={!!formData.cliente_id || !!servicoEdicao} // Disable if client selected or editing
                  className="bg-gray-700 border-green-500/30 text-white focus:border-green-500"
                />
              </div>
            </div>
          </div>

          {/* Prestador */}
          <div className="space-y-4 bg-gray-700/30 p-4 rounded-lg border border-green-500/20">
            <h3 className="font-semibold text-lg flex items-center gap-2 text-white">
              <Badge className="bg-green-500 text-white">2</Badge>
              <Truck className="w-5 h-5 text-green-500" />
              Prestador *
            </h3>
            <div className="space-y-2">
              <Select
                required
                value={formData.prestador_id}
                onValueChange={(value) => setFormData({...formData, prestador_id: value})}
                disabled={!!servicoEdicao} // Disable prestador selection if editing existing service
              >
                <SelectTrigger className={`bg-gray-700 border-green-500/30 text-white focus:border-green-500 ${servicoEdicao ? 'opacity-60 cursor-not-allowed' : ''}`}>
                  <SelectValue placeholder="Selecione um prestador" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-green-500/30">
                  {prestadores.filter(p => p.ativo).map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome} - {p.tipo_servico}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {servicoEdicao && (
                <p className="text-xs text-gray-400">
                  🔒 Prestador não pode ser alterado após a criação do serviço.
                </p>
              )}
            </div>
          </div>

          {/* Itinerário */}
          <div className="space-y-4 bg-gray-700/30 p-4 rounded-lg border border-green-500/20">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg flex items-center gap-2 text-white">
                <Badge className="bg-green-500 text-white">3</Badge>
                <MapPin className="w-5 h-5 text-green-500" />
                Itinerário
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={adicionarEndereco}
                className="border-green-500/30 text-green-400 hover:bg-green-500/10"
              >
                <Plus className="w-4 h-4 mr-1" />
                Adicionar Endereço
              </Button>
            </div>
            <div className="space-y-3">
              {formData.enderecos.map((endereco, index) => (
                <div key={index} className="p-4 border border-gray-600 rounded-lg space-y-3 bg-gray-800/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-green-500" />
                      <span className="font-medium text-white">Endereço {index + 1}</span>
                    </div>
                    {formData.enderecos.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removerEndereco(index)}
                        className="text-red-400 hover:text-red-500 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label className="text-gray-300">Tipo</Label>
                      <Select
                        value={endereco.tipo}
                        onValueChange={(value) => atualizarEndereco(index, 'tipo', value)}
                      >
                        <SelectTrigger className="bg-gray-700 border-green-500/30 text-white focus:border-green-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-700 border-green-500/30">
                          <SelectItem value="Coleta">Coleta</SelectItem>
                          <SelectItem value="Entrega">Entrega</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-gray-300">Endereço Completo</Label>
                      <Input
                        value={endereco.endereco}
                        onChange={(e) => atualizarEndereco(index, 'endereco', e.target.value)}
                        placeholder="Digite o endereço completo"
                        className="bg-gray-700 border-green-500/30 text-white focus:border-green-500"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-3">
                      <Label className="text-gray-300">Observação</Label>
                      <Input
                        value={endereco.observacao}
                        onChange={(e) => atualizarEndereco(index, 'observacao', e.target.value)}
                        placeholder="Observações específicas deste endereço"
                        className="bg-gray-700 border-green-500/30 text-white focus:border-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financeiro */}
          <div className="space-y-4 bg-gray-700/30 p-4 rounded-lg border border-green-500/20">
            <h3 className="font-semibold text-lg flex items-center gap-2 text-white">
              <Badge className="bg-green-500 text-white">4</Badge>
              <DollarSign className="w-5 h-5 text-green-500" />
              Financeiro
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Valor Total (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.valor_total}
                  onChange={(e) => setFormData({...formData, valor_total: parseFloat(e.target.value)})}
                  className="bg-gray-700 border-green-500/30 text-white focus:border-green-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Forma de Pagamento *</Label>
                <Select
                  value={formData.forma_pagamento}
                  onValueChange={(value) => setFormData({...formData, forma_pagamento: value})}
                >
                  <SelectTrigger className="bg-gray-700 border-green-500/30 text-white focus:border-green-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-green-500/30">
                    <SelectItem value="PIX">PIX</SelectItem>
                    <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="Faturado (Notinha)">Faturado (Notinha)</SelectItem>
                    <SelectItem value="Faturado (Planilha)">Faturado (Planilha)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Agendamento e Detalhes Adicionais */}
          <div className="space-y-4 bg-gray-700/30 p-4 rounded-lg border border-green-500/20">
            <h3 className="font-semibold text-lg flex items-center gap-2 text-white">
              <Badge className="bg-green-500 text-white">5</Badge>
              <Calendar className="w-5 h-5 text-green-500" />
              Agendamento e Detalhes
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2 col-span-full">
                <Checkbox
                  id="agendado"
                  checked={formData.agendado}
                  onCheckedChange={(checked) => setFormData({...formData, agendado: checked})}
                />
                <label htmlFor="agendado" className="text-sm font-medium cursor-pointer text-gray-300">
                  Este serviço é agendado
                </label>
              </div>
              {formData.agendado && (
                <div className="space-y-2 col-span-full">
                  <Label className="text-gray-300">Data e Hora do Agendamento</Label>
                  <Input
                    type="datetime-local"
                    value={formData.data_agendamento}
                    onChange={(e) => setFormData({...formData, data_agendamento: e.target.value})}
                    className="bg-gray-700 border-green-500/30 text-white focus:border-green-500"
                  />
                  <p className="text-xs text-gray-500">
                    ⏰ O horário será salvo conforme o relógio do seu dispositivo
                  </p>
                </div>
              )}
              <div className="flex items-center space-x-2 col-span-full">
                <Checkbox
                  id="urgente"
                  checked={formData.urgente}
                  onCheckedChange={(checked) => setFormData({...formData, urgente: checked})}
                />
                <label htmlFor="urgente" className="text-sm font-medium cursor-pointer text-gray-300">
                  Serviço Urgente
                </label>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300 flex items-center gap-1">
                  <Car className="w-4 h-4 text-green-500" />
                  Tipo de Veículo
                </Label>
                <Select
                  value={formData.tipo_veiculo}
                  onValueChange={(value) => setFormData({...formData, tipo_veiculo: value})}
                >
                  <SelectTrigger className="bg-gray-700 border-green-500/30 text-white focus:border-green-500">
                    <SelectValue placeholder="Selecione o tipo de veículo" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-green-500/30">
                    <SelectItem value="Moto">Moto</SelectItem>
                    <SelectItem value="Carro Pequeno">Carro Pequeno</SelectItem>
                    <SelectItem value="Carro Grande">Carro Grande</SelectItem>
                    <SelectItem value="Van">Van</SelectItem>
                    <SelectItem value="Caminhão">Caminhão</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300 flex items-center gap-1">
                  <Gauge className="w-4 h-4 text-green-500" />
                  Distância (KM)
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.distancia_km || ""}
                  onChange={(e) => setFormData({...formData, distancia_km: e.target.value ? parseFloat(e.target.value) : null})}
                  placeholder="Distância estimada em KM"
                  className="bg-gray-700 border-green-500/30 text-white focus:border-green-500"
                />
              </div>
              <div className="space-y-2 col-span-full">
                <Label className="text-gray-300 flex items-center gap-1">
                  <Clock className="w-4 h-4 text-green-500" />
                  Tempo Estimado (hh:mm)
                </Label>
                <Input
                  type="text"
                  value={formData.tempo_estimado}
                  onChange={(e) => setFormData({...formData, tempo_estimado: e.target.value})}
                  placeholder="Ex: 01:30 (1h30min)"
                  className="bg-gray-700 border-green-500/30 text-white focus:border-green-500"
                />
              </div>
            </div>
          </div>

          {/* Observação Geral */}
          <div className="space-y-2">
            <Label className="text-gray-300">Observação Geral</Label>
            <Textarea
              value={formData.observacao_geral}
              onChange={(e) => setFormData({...formData, observacao_geral: e.target.value})}
              rows={3}
              placeholder="Observações gerais sobre o serviço"
              className="bg-gray-700 border-green-500/30 text-white focus:border-green-500"
            />
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4 border-t border-green-500/20">
            <Button
              type="button"
              variant="outline"
              onClick={handleFechar}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (servicoEdicao ? "Salvando..." : "Criando...") : (servicoEdicao ? "Salvar Alterações" : "Criar Serviço")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
