import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Shield, User, Truck, Edit, Search, Users, CheckSquare, Square, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { SYSTEM_PAGES, getDefaultPermissions } from "@/components/utils/pages";

export default function Usuarios() {
  const [dialogAberto, setDialogAberto] = useState(false);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState(null);
  const [busca, setBusca] = useState("");

  const queryClient = useQueryClient();

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => base44.entities.User.list()
  });

  const { data: prestadores = [] } = useQuery({
    queryKey: ['prestadores'],
    queryFn: () => base44.entities.Prestador.list()
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['usuarios']);
      setDialogAberto(false);
      setUsuarioSelecionado(null);
    }
  });

  const abrirEdicao = (usuario) => {
    const permissoes = usuario.permissoes || [];
    const tipos_usuario = usuario.tipos_usuario || ["Administrador"];
    
    setUsuarioSelecionado({
      ...usuario,
      tipos_usuario,
      permissoes,
      prestador_id: usuario.prestador_id || ""
    });
    setDialogAberto(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    let permissoesFinais = usuarioSelecionado.permissoes || [];
    
    if (permissoesFinais.length === 0 && usuarioSelecionado.tipos_usuario.length > 0) {
      permissoesFinais = getDefaultPermissions(usuarioSelecionado.tipos_usuario);
    }
    
    updateMutation.mutate({ 
      id: usuarioSelecionado.id, 
      data: {
        tipos_usuario: usuarioSelecionado.tipos_usuario,
        prestador_id: usuarioSelecionado.prestador_id,
        permissoes: permissoesFinais
      }
    });
  };

  const handleTipoChange = (tipo) => {
    let novosTipos = [...(usuarioSelecionado.tipos_usuario || [])];
    
    if (novosTipos.includes(tipo)) {
      novosTipos = novosTipos.filter(t => t !== tipo);
    } else {
      novosTipos.push(tipo);
    }

    const permissoesPadrao = getDefaultPermissions(novosTipos);

    setUsuarioSelecionado({
      ...usuarioSelecionado,
      tipos_usuario: novosTipos,
      permissoes: permissoesPadrao
    });
  };

  const handlePermissaoChange = (permissao) => {
    let novasPermissoes = [...(usuarioSelecionado.permissoes || [])];
    
    if (novasPermissoes.includes(permissao)) {
      novasPermissoes = novasPermissoes.filter(p => p !== permissao);
    } else {
      novasPermissoes.push(permissao);
    }

    setUsuarioSelecionado({
      ...usuarioSelecionado,
      permissoes: novasPermissoes
    });
  };

  const handleMarcarTodasPermissoes = () => {
    const todasPermissoes = SYSTEM_PAGES.map(p => p.name);
    setUsuarioSelecionado({
      ...usuarioSelecionado,
      permissoes: todasPermissoes
    });
  };

  const handleDesmarcarTodasPermissoes = () => {
    setUsuarioSelecionado({
      ...usuarioSelecionado,
      permissoes: []
    });
  };

  const prestadoresVinculados = new Set(usuarios.map(u => u.prestador_id).filter(Boolean));
  const prestadoresDisponiveis = prestadores.filter(p => 
    !prestadoresVinculados.has(p.id) || p.id === usuarioSelecionado?.prestador_id
  );

  const usuariosFiltrados = usuarios.filter(u =>
    u.full_name?.toLowerCase().includes(busca.toLowerCase()) ||
    u.email?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4 md:p-8 space-y-6">
      <div>
        <h2 className="text-4xl font-bold text-white flex items-center gap-3">
          <Users className="w-10 h-10 text-green-500" />
          Gerenciamento de Usuários
        </h2>
        <p className="text-gray-400 mt-2">Controle tipos de usuário, permissões e vínculos</p>
      </div>

      <Alert className="bg-cyan-500/10 border-cyan-500/30">
        <Shield className="w-4 h-4 text-cyan-500" />
        <AlertDescription className="text-cyan-300">
          Os usuários são gerenciados através do painel de administração. 
          Para convidar novos usuários, use a função "Convidar Usuário" na aba Dashboard → Dados.
          Aqui você pode editar tipos de usuário, vincular prestadores e definir permissões customizadas.
        </AlertDescription>
      </Alert>

      <Card className="border-2 border-green-500/20 bg-gray-800/50 backdrop-blur shadow-xl">
        <CardHeader className="border-b border-green-500/20 bg-gray-800/30">
          <div className="flex items-center gap-3">
            <Search className="w-5 h-5 text-green-500" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="flex-1 border-none bg-transparent focus-visible:ring-0 text-white placeholder:text-gray-500"
            />
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {usuariosFiltrados.map((usuario) => {
                const prestadorVinculado = prestadores.find(p => p.id === usuario.prestador_id);
                const tipos = usuario.tipos_usuario || ["Administrador"];
                const permissoes = usuario.permissoes || [];
                
                return (
                  <Card 
                    key={usuario.id} 
                    className="hover:shadow-xl transition-all cursor-pointer border-2 border-green-500/20 bg-gray-700/30 hover:bg-gray-700/50 hover:border-green-500/50"
                    onClick={() => abrirEdicao(usuario)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            tipos.includes("Administrador") 
                              ? "bg-gradient-to-r from-green-500 to-emerald-600" 
                              : "bg-gradient-to-r from-blue-500 to-cyan-500"
                          }`}>
                            {tipos.includes("Administrador") ? (
                              <Shield className="w-6 h-6 text-white" />
                            ) : (
                              <User className="w-6 h-6 text-white" />
                            )}
                          </div>
                          <div>
                            <CardTitle className="text-lg text-white">{usuario.full_name}</CardTitle>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {tipos.map(tipo => (
                                <Badge 
                                  key={tipo}
                                  variant="outline" 
                                  className={
                                    tipo === "Administrador"
                                      ? "border-green-500/30 text-green-400"
                                      : "border-cyan-500/30 text-cyan-400"
                                  }
                                >
                                  {tipo}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            abrirEdicao(usuario); 
                          }}
                          className="text-gray-400 hover:text-green-400 hover:bg-green-500/10"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <p className="text-sm text-gray-400">Email</p>
                        <p className="text-sm text-white font-medium">{usuario.email}</p>
                      </div>
                      {prestadorVinculado && (
                        <div className="flex items-center gap-2 mt-2">
                          <Truck className="w-4 h-4 text-cyan-500" />
                          <span className="text-sm text-cyan-400">{prestadorVinculado.nome}</span>
                        </div>
                      )}
                      {permissoes.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Permissões Customizadas</p>
                          <div className="flex flex-wrap gap-1">
                            {permissoes.slice(0, 3).map(perm => (
                              <Badge key={perm} variant="outline" className="text-xs border-gray-600 text-gray-400">
                                {perm}
                              </Badge>
                            ))}
                            {permissoes.length > 3 && (
                              <Badge variant="outline" className="text-xs border-gray-600 text-gray-400">
                                +{permissoes.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-gray-800 border-2 border-green-500/30">
          <DialogHeader>
            <DialogTitle className="text-white">Editar Usuário</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-gray-300">Nome Completo</Label>
              <Input
                disabled
                value={usuarioSelecionado?.full_name || ""}
                className="bg-gray-700 border-green-500/30 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Email</Label>
              <Input
                disabled
                value={usuarioSelecionado?.email || ""}
                className="bg-gray-700 border-green-500/30 text-white"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-gray-300">Tipos de Usuário</Label>
              <div className="flex flex-col gap-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="tipo-admin"
                    checked={usuarioSelecionado?.tipos_usuario?.includes("Administrador")}
                    onCheckedChange={() => handleTipoChange("Administrador")}
                  />
                  <label htmlFor="tipo-admin" className="text-sm font-medium text-gray-300 cursor-pointer">
                    Administrador
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="tipo-prestador"
                    checked={usuarioSelecionado?.tipos_usuario?.includes("Prestador")}
                    onCheckedChange={() => handleTipoChange("Prestador")}
                  />
                  <label htmlFor="tipo-prestador" className="text-sm font-medium text-gray-300 cursor-pointer">
                    Prestador
                  </label>
                </div>
              </div>
            </div>

            {usuarioSelecionado?.tipos_usuario?.includes("Prestador") && (
              <div className="space-y-2">
                <Label className="text-gray-300">Vincular ao Prestador</Label>
                <Select 
                  value={usuarioSelecionado.prestador_id || ""} 
                  onValueChange={(value) => setUsuarioSelecionado({...usuarioSelecionado, prestador_id: value})}
                >
                  <SelectTrigger className="bg-gray-700 border-green-500/30 text-white">
                    <SelectValue placeholder="Selecione um prestador" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-green-500/30">
                    <SelectItem value={null}>Nenhum</SelectItem>
                    {prestadoresDisponiveis.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-gray-300">Permissões Customizadas (Páginas Acessíveis)</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleMarcarTodasPermissoes}
                    className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                  >
                    <CheckSquare className="w-3 h-3 mr-1" />
                    Marcar Todas
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDesmarcarTodasPermissoes}
                    className="border-gray-600 text-gray-400 hover:bg-gray-700"
                  >
                    <Square className="w-3 h-3 mr-1" />
                    Desmarcar Todas
                  </Button>
                </div>
              </div>
              <p className="text-sm text-gray-500">
                {usuarioSelecionado?.permissoes?.length === 0 
                  ? "Quando vazio, o usuário terá acesso às páginas padrão do seu tipo." 
                  : "Páginas selecionadas determinam o acesso específico do usuário."}
              </p>
              <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto p-2 bg-gray-700/30 rounded-lg border border-green-500/20">
                {SYSTEM_PAGES.map(page => (
                  <div key={page.name} className="flex items-center space-x-2 p-2 hover:bg-gray-700/50 rounded">
                    <Checkbox
                      id={`page-${page.name}`}
                      checked={usuarioSelecionado?.permissoes?.includes(page.name) || false}
                      onCheckedChange={() => handlePermissaoChange(page.name)}
                    />
                    <label htmlFor={`page-${page.name}`} className="text-sm font-medium text-gray-300 cursor-pointer flex-1">
                      {page.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <Alert className="bg-yellow-500/10 border-yellow-500/30">
              <AlertCircle className="w-4 h-4 text-yellow-400" />
              <AlertDescription className="text-yellow-300 text-sm">
                <strong>Atenção:</strong> As permissões serão sincronizadas automaticamente
                e aplicadas no próximo login do usuário.
              </AlertDescription>
            </Alert>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogAberto(false)} className="border-gray-600 text-gray-300 hover:bg-gray-700">
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}