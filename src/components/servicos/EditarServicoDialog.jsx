
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, MapPin, Clock, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toInputDateTime } from "@/components/utils/dateUtils";

export default function EditarServicoDialog({ aberto, setAberto, servico, onSalvar, tempoRestante }) {
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
    observacao_geral: "",
    tipo_veiculo: ""
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list('nome')
  });

  // Carregar dados do serviço quando abrir
  useEffect(() => {
    if (servico && aberto) {
      setFormData({
        cliente_id: servico.cliente_id || "",
        cliente_nome_avulso: servico.cliente_nome_avulso || "",
        prestador_id: servico.prestador_id || "",
        valor_total: servico.valor_total || 0,
        forma_pagamento: servico.forma_pagamento || "PIX",
        enderecos: servico.enderecos && servico.enderecos.length > 0 
          ? servico.enderecos 
          : [
              { tipo: "Coleta", endereco: "", observacao: "" },
              { tipo: "Entrega", endereco: "", observacao: "" }
            ],
        agendado: servico.agendado || false,
        data_agendamento: servico.data_agendamento ? toInputDateTime(servico.data_agendamento) : "",
        observacao_geral: servico.observacao_geral || "",
        tipo_veiculo: servico.tipo_veiculo || ""
      });
    }
  }, [servico, aberto]);

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
    onSalvar(formData);
  };

  const handleFechar = () => {
    setAberto(false);
  };

  if (!servico) return null;

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-800 border-2 border-yellow-500/30">
        <DialogHeader className="border-b border-yellow-500/20 pb-4">
          <DialogTitle className="text-white flex items-center justify-between gap-2 text-2xl">
            <div className="flex items-center gap-2">
              <Clock className="w-6 h-6 text-yellow-500" />
              Editar Serviço #{servico.numero_pedido || servico.id?.slice(-5).toUpperCase()}
            </div>
            {tempoRestante && (
              <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                <AlertCircle className="w-3 h-3 mr-1" />
                {tempoRestante} restantes
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cliente */}
          <div className="space-y-4 bg-gray-700/30 p-4 rounded-lg border border-yellow-500/20">
            <h3 className="font-semibold text-lg flex items-center gap-2 text-white">
              <Badge className="bg-yellow-500 text-white">1</Badge>
              Cliente
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Cliente Cadastrado</Label>
                <Select
                  value={formData.cliente_id}
                  onValueChange={(value) => setFormData({...formData, cliente_id: value, cliente_nome_avulso: ""})}
                >
                  <SelectTrigger className="bg-gray-700 border-yellow-500/30 text-white focus:border-yellow-500">
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-yellow-500/30">
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
                  disabled={!!formData.cliente_id}
                  className="bg-gray-700 border-yellow-500/30 text-white focus:border-yellow-500"
                />
              </div>
            </div>
          </div>

          {/* Itinerário */}
          <div className="space-y-4 bg-gray-700/30 p-4 rounded-lg border border-yellow-500/20">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg flex items-center gap-2 text-white">
                <Badge className="bg-yellow-500 text-white">2</Badge>
                <MapPin className="w-5 h-5 text-yellow-500" />
                Itinerário
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={adicionarEndereco}
                className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
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
                      <MapPin className="w-4 h-4 text-yellow-500" />
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
                        <SelectTrigger className="bg-gray-700 border-yellow-500/30 text-white focus:border-yellow-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-700 border-yellow-500/30">
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
                        className="bg-gray-700 border-yellow-500/30 text-white focus:border-yellow-500"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-3">
                      <Label className="text-gray-300">Observação</Label>
                      <Input
                        value={endereco.observacao}
                        onChange={(e) => atualizarEndereco(index, 'observacao', e.target.value)}
                        placeholder="Observações específicas deste endereço"
                        className="bg-gray-700 border-yellow-500/30 text-white focus:border-yellow-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financeiro */}
          <div className="space-y-4 bg-gray-700/30 p-4 rounded-lg border border-yellow-500/20">
            <h3 className="font-semibold text-lg flex items-center gap-2 text-white">
              <Badge className="bg-yellow-500 text-white">3</Badge>
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
                  className="bg-gray-700 border-yellow-500/30 text-white focus:border-yellow-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Forma de Pagamento *</Label>
                <Select
                  value={formData.forma_pagamento}
                  onValueChange={(value) => setFormData({...formData, forma_pagamento: value})}
                >
                  <SelectTrigger className="bg-gray-700 border-yellow-500/30 text-white focus:border-yellow-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-yellow-500/30">
                    <SelectItem value="PIX">PIX</SelectItem>
                    <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="Faturado (Notinha)">Faturado (Notinha)</SelectItem>
                    <SelectItem value="Faturado (Planilha)">Faturado (Planilha)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Tipo de Veículo */}
          <div className="space-y-2">
            <Label className="text-gray-300">Tipo de Veículo</Label>
            <Select
              value={formData.tipo_veiculo}
              onValueChange={(value) => setFormData({...formData, tipo_veiculo: value})}
            >
              <SelectTrigger className="bg-gray-700 border-yellow-500/30 text-white focus:border-yellow-500">
                <SelectValue placeholder="Selecione o tipo de veículo" />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-yellow-500/30">
                <SelectItem value={null}>Nenhum</SelectItem>
                <SelectItem value="Moto">Moto</SelectItem>
                <SelectItem value="Carro">Carro</SelectItem>
                <SelectItem value="Van">Van</SelectItem>
                <SelectItem value="Caminhão">Caminhão</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Agendamento */}
          <div className="space-y-4 bg-gray-700/30 p-4 rounded-lg border border-yellow-500/20">
            <h3 className="font-semibold text-lg flex items-center gap-2 text-white">
              <Badge className="bg-yellow-500 text-white">4</Badge>
              <Clock className="w-5 h-5 text-yellow-500" />
              Agendamento
            </h3>
            <div className="flex items-center space-x-2">
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
              <div className="space-y-2">
                <Label className="text-gray-300">Data e Hora do Agendamento</Label>
                <Input
                  type="datetime-local"
                  value={formData.data_agendamento}
                  onChange={(e) => setFormData({...formData, data_agendamento: e.target.value})}
                  className="bg-gray-700 border-yellow-500/30 text-white focus:border-yellow-500"
                />
                <p className="text-xs text-gray-500">
                  ⏰ O horário será salvo conforme o relógio do seu dispositivo
                </p>
              </div>
            )}
          </div>

          {/* Observação Geral */}
          <div className="space-y-2">
            <Label className="text-gray-300">Observação Geral</Label>
            <Textarea
              value={formData.observacao_geral}
              onChange={(e) => setFormData({...formData, observacao_geral: e.target.value})}
              rows={3}
              placeholder="Observações gerais sobre o serviço"
              className="bg-gray-700 border-yellow-500/30 text-white focus:border-yellow-500"
            />
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4 border-t border-yellow-500/20">
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
              className="bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white shadow-lg"
            >
              Salvar Alterações
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
