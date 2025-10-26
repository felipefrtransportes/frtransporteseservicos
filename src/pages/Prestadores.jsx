
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Truck, Bike, Phone, CreditCard, Search, Plus, Edit, Building2, Trash2 } from "lucide-react";

export default function Prestadores() {
  const [busca, setBusca] = useState("");
  const [dialogAberto, setDialogAberto] = useState(false);
  const [prestadorSelecionado, setPrestadorSelecionado] = useState(null);
  const [formData, setFormData] = useState({
    nome: "",
    cpf: "",
    telefone: "",
    email: "",
    tipo_servico: "Motoboy",
    comissao_percentual: 85,
    banco: "",
    agencia: "",
    conta: "",
    chave_pix: "",
    usuario_vinculado_id: "",
    observacoes: "",
    ativo: true
  });

  const queryClient = useQueryClient();

  const { data: prestadores = [], isLoading } = useQuery({
    queryKey: ['prestadores'],
    queryFn: () => base44.entities.Prestador.list('nome')
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => base44.entities.User.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Prestador.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['prestadores']);
      setDialogAberto(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Prestador.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['prestadores']);
      setDialogAberto(false);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Prestador.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['prestadores']);
    }
  });

  const resetForm = () => {
    setFormData({
      nome: "",
      cpf: "",
      telefone: "",
      email: "",
      tipo_servico: "Motoboy",
      comissao_percentual: 85,
      banco: "",
      agencia: "",
      conta: "",
      chave_pix: "",
      usuario_vinculado_id: "",
      observacoes: "",
      ativo: true
    });
    setPrestadorSelecionado(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (prestadorSelecionado) {
      updateMutation.mutate({ id: prestadorSelecionado.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const abrirEdicao = (prestador) => {
    setPrestadorSelecionado(prestador);
    setFormData(prestador);
    setDialogAberto(true);
  };

  const abrirNovo = () => {
    resetForm();
    setDialogAberto(true);
  };

  const handleExcluir = (e, prestador) => {
    e.stopPropagation();
    if (window.confirm(`Tem certeza que deseja excluir o prestador "${prestador.nome}"?`)) {
      deleteMutation.mutate(prestador.id);
    }
  };

  const prestadoresFiltrados = prestadores
    .filter(p => 
      p.nome?.toLowerCase().includes(busca.toLowerCase()) ||
      p.telefone?.includes(busca) ||
      p.tipo_servico?.toLowerCase().includes(busca.toLowerCase())
    )
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-4xl font-bold text-white flex items-center gap-3">
            <Truck className="w-10 h-10 text-green-500" />
            Prestadores
          </h2>
          <p className="text-gray-400 mt-2">Gerencie seus motoboys e motoristas</p>
        </div>
        <Button 
          onClick={abrirNovo}
          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-green-500/50"
        >
          <Plus className="w-5 h-5 mr-2" />
          Cadastrar Novo Prestador
        </Button>
      </div>

      <Card className="border-2 border-green-500/20 bg-gray-800/50 backdrop-blur shadow-xl">
        <CardHeader className="border-b border-green-500/20 bg-gray-800/30">
          <div className="flex items-center gap-3">
            <Search className="w-5 h-5 text-green-500" />
            <Input
              placeholder="Buscar por nome, telefone ou tipo de serviço..."
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
            ) : prestadoresFiltrados.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500">Nenhum prestador encontrado</p>
              </div>
            ) : (
              prestadoresFiltrados.map((prestador) => (
                <Card 
                  key={prestador.id} 
                  className="border-2 border-green-500/20 bg-gray-700/30 hover:bg-gray-700/50 hover:border-green-500/40 hover:shadow-lg hover:shadow-green-500/20 transition-all cursor-pointer"
                  onClick={() => abrirEdicao(prestador)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {prestador.tipo_servico === "Motoboy" ? (
                          <Bike className="w-5 h-5 text-green-500" />
                        ) : (
                          <Truck className="w-5 h-5 text-cyan-500" />
                        )}
                        <Badge variant="outline" className={
                          prestador.tipo_servico === "Motoboy" ? "border-green-500/30 text-green-400" : "border-cyan-500/30 text-cyan-400"
                        }>
                          {prestador.tipo_servico}
                        </Badge>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-green-400 hover:bg-green-500/10" onClick={(e) => { e.stopPropagation(); abrirEdicao(prestador); }}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={(e) => handleExcluir(e, prestador)}
                          className="text-red-400 hover:text-red-500 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <CardTitle className="text-lg mt-2 text-white">{prestador.nome}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <Phone className="w-4 h-4 text-green-500" />
                      {prestador.telefone}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <CreditCard className="w-4 h-4 text-green-500" />
                      Comissão: {prestador.comissao_percentual}%
                    </div>
                    {prestador.chave_pix && (
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <Building2 className="w-4 h-4 text-green-500" />
                        PIX: {prestador.chave_pix.slice(0, 20)}...
                      </div>
                    )}
                    <Badge variant={prestador.ativo ? "default" : "secondary"} className={prestador.ativo ? "bg-green-500 text-white" : "bg-gray-600 text-gray-300"}>
                      {prestador.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-gray-800 border-2 border-green-500/30">
          <DialogHeader>
            <DialogTitle className="text-white">
              {prestadorSelecionado ? "Editar Prestador" : "Cadastrar Novo Prestador"}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-green-400">Dados Pessoais</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">Nome Completo *</Label>
                  <Input
                    required
                    value={formData.nome}
                    onChange={(e) => setFormData({...formData, nome: e.target.value})}
                    className="bg-gray-700 border-green-500/30 text-white focus:border-green-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">CPF</Label>
                  <Input
                    value={formData.cpf}
                    onChange={(e) => setFormData({...formData, cpf: e.target.value})}
                    className="bg-gray-700 border-green-500/30 text-white focus:border-green-500"
                  />
                </div>
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
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-green-400">Informações de Serviço</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">Tipo de Serviço *</Label>
                  <Select value={formData.tipo_servico} onValueChange={(value) => setFormData({...formData, tipo_servico: value})}>
                    <SelectTrigger className="bg-gray-700 border-green-500/30 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-green-500/30">
                      <SelectItem value="Motoboy">Motoboy</SelectItem>
                      <SelectItem value="Motorista">Motorista</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Comissão (%) *</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={formData.comissao_percentual}
                    onChange={(e) => setFormData({...formData, comissao_percentual: parseFloat(e.target.value)})}
                    className="bg-gray-700 border-green-500/30 text-white focus:border-green-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Vincular Usuário</Label>
                  <Select value={formData.usuario_vinculado_id} onValueChange={(value) => setFormData({...formData, usuario_vinculado_id: value})}>
                    <SelectTrigger className="bg-gray-700 border-green-500/30 text-white">
                      <SelectValue placeholder="Selecione um usuário" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-green-500/30">
                      <SelectItem value={null}>Nenhum</SelectItem>
                      {usuarios.filter(u => u.tipos_usuario?.includes("Prestador")).map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.full_name} ({u.email})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-green-400">Dados Bancários</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">Banco</Label>
                  <Input
                    value={formData.banco}
                    onChange={(e) => setFormData({...formData, banco: e.target.value})}
                    className="bg-gray-700 border-green-500/30 text-white focus:border-green-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Agência</Label>
                  <Input
                    value={formData.agencia}
                    onChange={(e) => setFormData({...formData, agencia: e.target.value})}
                    className="bg-gray-700 border-green-500/30 text-white focus:border-green-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Conta</Label>
                  <Input
                    value={formData.conta}
                    onChange={(e) => setFormData({...formData, conta: e.target.value})}
                    className="bg-gray-700 border-green-500/30 text-white focus:border-green-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Chave PIX</Label>
                  <Input
                    value={formData.chave_pix}
                    onChange={(e) => setFormData({...formData, chave_pix: e.target.value})}
                    className="bg-gray-700 border-green-500/30 text-white focus:border-green-500"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Observações</Label>
              <Textarea
                value={formData.observacoes}
                onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                rows={3}
                className="bg-gray-700 border-green-500/30 text-white focus:border-green-500"
              />
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
                {prestadorSelecionado ? "Atualizar" : "Cadastrar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
