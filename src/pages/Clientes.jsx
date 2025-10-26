
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, User, Phone, MapPin, Search, Plus, Edit, Mail, Trash2, Users, FileText, Calendar } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Clientes() {
  const [busca, setBusca] = useState("");
  const [dialogAberto, setDialogAberto] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [formData, setFormData] = useState({
    tipo_pessoa: "PJ",
    nome: "",
    cnpj: "",
    inscricao_estadual: "",
    cpf: "",
    endereco_completo: "",
    telefone: "",
    email: "",
    observacoes: "",
    tipo_pagamento: "A_VISTA",
    tipo_faturamento: "Mensal",
    dias_fechamento: [],
    regra_vencimento: "5_dias_uteis",
    dia_vencimento_fixo: null,
    ultimo_fechamento: null
  });

  const queryClient = useQueryClient();

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list('nome')
  });

  const createMutation = useMutation({
    mutationFn: (data) => {
      const dadosCliente = {
        ...data,
        faturamento_ativo: data.tipo_pagamento !== "A_VISTA"
      };
      return base44.entities.Cliente.create(dadosCliente);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clientes']);
      setDialogAberto(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => {
      const dadosCliente = {
        ...data,
        faturamento_ativo: data.tipo_pagamento !== "A_VISTA"
      };
      return base44.entities.Cliente.update(id, dadosCliente);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clientes']);
      setDialogAberto(false);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Cliente.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['clientes']);
    }
  });

  const resetForm = () => {
    setFormData({
      tipo_pessoa: "PJ",
      nome: "",
      cnpj: "",
      inscricao_estadual: "",
      cpf: "",
      endereco_completo: "",
      telefone: "",
      email: "",
      observacoes: "",
      tipo_pagamento: "A_VISTA",
      tipo_faturamento: "Mensal",
      dias_fechamento: [],
      regra_vencimento: "5_dias_uteis",
      dia_vencimento_fixo: null,
      ultimo_fechamento: null
    });
    setClienteSelecionado(null);
  };

  const handleSubmit = (e) => {
    // Check if e is an event object (from a form submit) or undefined (from a button click)
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }

    if (clienteSelecionado) {
      updateMutation.mutate({ id: clienteSelecionado.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const abrirEdicao = (cliente) => {
    setClienteSelecionado(cliente);
    setFormData({
      ...cliente,
      dias_fechamento: cliente.dias_fechamento || [],
      tipo_pagamento: cliente.tipo_pagamento || "A_VISTA"
    });
    setDialogAberto(true);
  };

  const abrirNovo = () => {
    resetForm();
    setDialogAberto(true);
  };

  const handleExcluir = (e, cliente) => {
    e.stopPropagation();
    if (window.confirm(`Tem certeza que deseja excluir o cliente "${cliente.nome}"?`)) {
      deleteMutation.mutate(cliente.id);
    }
  };

  const handleToggleDiaFechamento = (dia) => {
    const dias = formData.dias_fechamento || [];
    if (dias.includes(dia)) {
      setFormData({...formData, dias_fechamento: dias.filter(d => d !== dia)});
    } else {
      setFormData({...formData, dias_fechamento: [...dias, dia]});
    }
  };

  const getTipoPagamentoBadge = (tipoPagamento) => {
    switch (tipoPagamento) {
      case "FATURAMENTO_AUTOMATICO":
        return { text: "Faturamento Automático", color: "bg-green-500/20 text-green-400 border-green-500/30" };
      case "FATURAMENTO_MANUAL":
        return { text: "Faturamento Manual", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" };
      case "A_VISTA":
      default:
        return { text: "À Vista", color: "bg-gray-500/20 text-gray-400 border-gray-500/30" };
    }
  };

  const clientesFiltrados = clientes
    .filter(c => 
      c.nome?.toLowerCase().includes(busca.toLowerCase()) ||
      c.endereco_completo?.toLowerCase().includes(busca.toLowerCase()) ||
      c.telefone?.includes(busca)
    )
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  const isPF = formData.tipo_pessoa === "PF";
  const isFaturamentoAutomatico = formData.tipo_pagamento === "FATURAMENTO_AUTOMATICO";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-4xl font-bold text-white flex items-center gap-3">
            <Users className="w-10 h-10 text-green-500" />
            Clientes
          </h2>
          <p className="text-gray-400 mt-2">Gerencie seus clientes cadastrados</p>
        </div>
        <Button 
          onClick={abrirNovo}
          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-green-500/50"
        >
          <Plus className="w-5 h-5 mr-2" />
          Cadastrar Novo Cliente
        </Button>
      </div>

      <Card className="border-2 border-green-500/20 bg-gray-800/50 backdrop-blur shadow-xl">
        <CardHeader className="border-b border-green-500/20 bg-gray-800/30">
          <div className="flex items-center gap-3">
            <Search className="w-5 h-5 text-green-500" />
            <Input
              placeholder="Buscar por nome, endereço ou telefone..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="flex-1 border-none bg-transparent focus-visible:ring-0 text-white placeholder:text-gray-500"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {isLoading ? (
              <div className="col-span-full text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
              </div>
            ) : clientesFiltrados.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500">Nenhum cliente encontrado</p>
              </div>
            ) : (
              clientesFiltrados.map((cliente) => {
                const badgeInfo = getTipoPagamentoBadge(cliente.tipo_pagamento);
                
                return (
                  <Card 
                    key={cliente.id} 
                    className="border-2 border-green-500/20 bg-gray-700/30 hover:bg-gray-700/50 hover:border-green-500/40 hover:shadow-lg hover:shadow-green-500/20 transition-all cursor-pointer"
                    onClick={() => abrirEdicao(cliente)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          {cliente.tipo_pessoa === "PJ" ? (
                            <Building2 className="w-5 h-5 text-green-500" />
                          ) : (
                            <User className="w-5 h-5 text-cyan-500" />
                          )}
                          <Badge variant="outline" className={
                            cliente.tipo_pessoa === "PJ" ? "border-green-500/30 text-green-400" : "border-cyan-500/30 text-cyan-400"
                          }>
                            {cliente.tipo_pessoa}
                          </Badge>
                          <Badge variant="outline" className={badgeInfo.color}>
                            {badgeInfo.text}
                          </Badge>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-green-400 hover:bg-green-500/10" onClick={(e) => { e.stopPropagation(); abrirEdicao(cliente); }}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={(e) => handleExcluir(e, cliente)}
                            className="text-red-400 hover:text-red-500 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <CardTitle className="text-lg mt-2 text-white">{cliente.nome}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <Phone className="w-4 h-4 text-green-500" />
                        {cliente.telefone}
                      </div>
                      <div className="flex items-start gap-2 text-sm text-gray-300">
                        <MapPin className="w-4 h-4 mt-0.5 text-green-500" />
                        <span className="line-clamp-2">{cliente.endereco_completo}</span>
                      </div>
                      {cliente.email && (
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                          <Mail className="w-4 h-4 text-green-500" />
                          {cliente.email}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-800 border-2 border-green-500/30">
          <DialogHeader>
            <DialogTitle className="text-white">
              {clienteSelecionado ? "Editar Cliente" : "Cadastrar Novo Cliente"}
            </DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="dados" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-gray-700">
              <TabsTrigger value="dados" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
                Dados Cadastrais
              </TabsTrigger>
              <TabsTrigger value="pagamento" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
                Tipo de Pagamento
              </TabsTrigger>
              <TabsTrigger value="faturamento" className="data-[state=active]:bg-green-500 data-[state=active]:text-white" disabled={!isFaturamentoAutomatico}>
                Config. Faturamento
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dados">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="pf"
                    checked={isPF}
                    onCheckedChange={(checked) => setFormData({...formData, tipo_pessoa: checked ? "PF" : "PJ"})}
                  />
                  <label htmlFor="pf" className="text-sm font-medium text-gray-300">
                    Pessoa Física (PF)
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-gray-300">Nome {!isPF && "/ Razão Social"} *</Label>
                    <Input
                      required
                      value={formData.nome}
                      onChange={(e) => setFormData({...formData, nome: e.target.value})}
                      className="bg-gray-700 border-green-500/30 text-white focus:border-green-500"
                    />
                  </div>

                  {!isPF && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-gray-300">CNPJ</Label>
                        <Input
                          value={formData.cnpj}
                          onChange={(e) => setFormData({...formData, cnpj: e.target.value})}
                          className="bg-gray-700 border-green-500/30 text-white focus:border-green-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-gray-300">Inscrição Estadual</Label>
                        <Input
                          value={formData.inscricao_estadual}
                          onChange={(e) => setFormData({...formData, inscricao_estadual: e.target.value})}
                          className="bg-gray-700 border-green-500/30 text-white focus:border-green-500"
                        />
                      </div>
                    </>
                  )}

                  {isPF && (
                    <div className="space-y-2">
                      <Label className="text-gray-300">CPF</Label>
                      <Input
                        value={formData.cpf}
                        onChange={(e) => setFormData({...formData, cpf: e.target.value})}
                        className="bg-gray-700 border-green-500/30 text-white focus:border-green-500"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-gray-300">Telefone *</Label>
                    <Input
                      required
                      value={formData.telefone}
                      onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                      className="bg-gray-700 border-green-500/30 text-white focus:border-green-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Email</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="bg-gray-700 border-green-500/30 text-white focus:border-green-500"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-gray-300">Endereço Completo *</Label>
                    <Input
                      required
                      value={formData.endereco_completo}
                      onChange={(e) => setFormData({...formData, endereco_completo: e.target.value})}
                      className="bg-gray-700 border-green-500/30 text-white focus:border-green-500"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-gray-300">Observações</Label>
                    <Textarea
                      value={formData.observacoes}
                      onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                      rows={3}
                      className="bg-gray-700 border-green-500/30 text-white focus:border-green-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogAberto(false)} className="border-gray-600 text-gray-300 hover:bg-gray-700">
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {clienteSelecionado ? "Atualizar" : "Cadastrar"}
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="pagamento" className="space-y-4">
              <div className="space-y-4 p-4 bg-gray-700/20 rounded-lg border border-green-500/10">
                <h3 className="font-semibold text-white text-lg mb-4">Selecione o Tipo de Pagamento</h3>
                
                <div className="space-y-3">
                  {/* À Vista */}
                  <div 
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      formData.tipo_pagamento === "A_VISTA" 
                        ? "border-gray-400 bg-gray-500/20" 
                        : "border-gray-600 bg-gray-700/30 hover:border-gray-500"
                    }`}
                    onClick={() => setFormData({...formData, tipo_pagamento: "A_VISTA"})}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        formData.tipo_pagamento === "A_VISTA" ? "border-gray-400" : "border-gray-600"
                      }`}>
                        {formData.tipo_pagamento === "A_VISTA" && (
                          <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-white">À Vista (Padrão)</p>
                        <p className="text-sm text-gray-400">Cliente não aparece no módulo Faturado. Pagamento em PIX ou Dinheiro.</p>
                      </div>
                      <Badge variant="outline" className="bg-gray-500/20 text-gray-400 border-gray-500/30">
                        À Vista
                      </Badge>
                    </div>
                  </div>

                  {/* Faturamento Manual */}
                  <div 
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      formData.tipo_pagamento === "FATURAMENTO_MANUAL" 
                        ? "border-orange-400 bg-orange-500/20" 
                        : "border-gray-600 bg-gray-700/30 hover:border-orange-500/50"
                    }`}
                    onClick={() => setFormData({...formData, tipo_pagamento: "FATURAMENTO_MANUAL"})}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        formData.tipo_pagamento === "FATURAMENTO_MANUAL" ? "border-orange-400" : "border-gray-600"
                      }`}>
                        {formData.tipo_pagamento === "FATURAMENTO_MANUAL" && (
                          <div className="w-3 h-3 rounded-full bg-orange-400"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-white">Faturamento Manual</p>
                        <p className="text-sm text-gray-400">Cliente aparece no Faturado. Fechamentos manuais definidos pelo administrador.</p>
                      </div>
                      <Badge variant="outline" className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                        Manual
                      </Badge>
                    </div>
                  </div>

                  {/* Faturamento Automático */}
                  <div 
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      formData.tipo_pagamento === "FATURAMENTO_AUTOMATICO" 
                        ? "border-green-400 bg-green-500/20" 
                        : "border-gray-600 bg-gray-700/30 hover:border-green-500/50"
                    }`}
                    onClick={() => setFormData({...formData, tipo_pagamento: "FATURAMENTO_AUTOMATICO"})}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        formData.tipo_pagamento === "FATURAMENTO_AUTOMATICO" ? "border-green-400" : "border-gray-600"
                      }`}>
                        {formData.tipo_pagamento === "FATURAMENTO_AUTOMATICO" && (
                          <div className="w-3 h-3 rounded-full bg-green-400"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-white">Faturamento Automático</p>
                        <p className="text-sm text-gray-400">Cliente aparece no Faturado com fechamentos automáticos conforme configuração.</p>
                      </div>
                      <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
                        Automático
                      </Badge>
                    </div>
                  </div>
                </div>

                {formData.tipo_pagamento === "FATURAMENTO_AUTOMATICO" && (
                  <div className="mt-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <p className="text-sm text-blue-300">
                      ℹ️ Para configurar dias de fechamento e vencimento, acesse a aba "Config. Faturamento"
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                <Button type="button" variant="outline" onClick={() => setDialogAberto(false)} className="border-gray-600 text-gray-300 hover:bg-gray-700">
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSubmit}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {clienteSelecionado ? "Atualizar" : "Cadastrar"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="faturamento" className="space-y-4">
              {isFaturamentoAutomatico && (
                <div className="space-y-4 p-4 bg-gray-700/20 rounded-lg border border-green-500/10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-300">Tipo de Faturamento *</Label>
                      <Select 
                        value={formData.tipo_faturamento} 
                        onValueChange={(value) => setFormData({...formData, tipo_faturamento: value})}
                      >
                        <SelectTrigger className="bg-gray-700 border-green-500/30 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-700 border-green-500/30">
                          <SelectItem value="Semanal">Semanal</SelectItem>
                          <SelectItem value="Quinzenal">Quinzenal</SelectItem>
                          <SelectItem value="Mensal">Mensal</SelectItem>
                          <SelectItem value="Personalizado">Personalizado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-300">Regra de Vencimento *</Label>
                      <Select 
                        value={formData.regra_vencimento} 
                        onValueChange={(value) => setFormData({...formData, regra_vencimento: value})}
                      >
                        <SelectTrigger className="bg-gray-700 border-green-500/30 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-700 border-green-500/30">
                          <SelectItem value="5_dias_uteis">5 dias úteis após fechamento</SelectItem>
                          <SelectItem value="dia_fixo">Dia fixo do mês</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.regra_vencimento === "dia_fixo" && (
                      <div className="space-y-2">
                        <Label className="text-gray-300">Dia Fixo de Vencimento (1-31)</Label>
                        <Input
                          type="number"
                          min="1"
                          max="31"
                          value={formData.dia_vencimento_fixo || ""}
                          onChange={(e) => setFormData({...formData, dia_vencimento_fixo: parseInt(e.target.value)})}
                          className="bg-gray-700 border-green-500/30 text-white focus:border-green-500"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Dias de Fechamento do Mês</Label>
                    <p className="text-xs text-gray-500 mb-2">Selecione os dias do mês em que o sistema deve realizar o fechamento automático</p>
                    <div className="grid grid-cols-7 gap-2">
                      {[...Array(31)].map((_, i) => {
                        const dia = i + 1;
                        const selecionado = (formData.dias_fechamento || []).includes(dia);
                        return (
                          <Button
                            key={dia}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleDiaFechamento(dia)}
                            className={
                              selecionado 
                                ? "bg-green-500 text-white border-green-500 hover:bg-green-600" 
                                : "bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600"
                            }
                          >
                            {dia}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  {formData.ultimo_fechamento && (
                    <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                      <div className="flex items-center gap-2 text-blue-400">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          Último fechamento: {format(new Date(formData.ultimo_fechamento), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                <Button type="button" variant="outline" onClick={() => setDialogAberto(false)} className="border-gray-600 text-gray-300 hover:bg-gray-700">
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSubmit}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {clienteSelecionado ? "Atualizar" : "Cadastrar"}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
