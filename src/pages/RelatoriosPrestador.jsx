
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar as CalendarIcon, 
  Download, 
  Filter, 
  FileText,
  TrendingUp,
  DollarSign,
  Package,
  CheckCircle,
  Clock,
  Target,
  User
} from "lucide-react";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function RelatoriosPrestador() {
  const [user, setUser] = useState(null);
  const [dataInicio, setDataInicio] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dataFim, setDataFim] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [statusFiltro, setStatusFiltro] = useState("");
  const [formaPagamentoFiltro, setFormaPagamentoFiltro] = useState("");
  const [clienteFiltro, setClienteFiltro] = useState("");

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

  const { data: servicos = [], isLoading } = useQuery({
    queryKey: ['servicos'],
    queryFn: () => base44.entities.Servico.list('-created_date'),
    enabled: !!user,
    refetchInterval: 5000 // ✅ Atualização automática
  });

  const { data: lancamentosPrestador = [] } = useQuery({
    queryKey: ['lancamentosprestador'],
    queryFn: () => base44.entities.LancamentoPrestador.list('-data_lancamento'),
    enabled: !!user,
    refetchInterval: 5000 // ✅ Atualização automática
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list('nome')
  });

  const aplicarAtalho = (tipo) => {
    const hoje = new Date();
    if (tipo === 'mes') {
      setDataInicio(format(startOfMonth(hoje), 'yyyy-MM-dd'));
      setDataFim(format(endOfMonth(hoje), 'yyyy-MM-dd'));
    } else if (tipo === 'semana') {
      const inicioSemana = new Date(hoje);
      inicioSemana.setDate(hoje.getDate() - hoje.getDay());
      const fimSemana = new Date(inicioSemana);
      fimSemana.setDate(inicioSemana.getDate() + 6);
      setDataInicio(format(inicioSemana, 'yyyy-MM-dd'));
      setDataFim(format(fimSemana, 'yyyy-MM-dd'));
    } else if (tipo === 'hoje') {
      setDataInicio(format(hoje, 'yyyy-MM-dd'));
      setDataFim(format(hoje, 'yyyy-MM-dd'));
    }
  };

  const meusServicos = servicos.filter(s => {
    if (!user?.prestador_id) return false;
    if (s.prestador_id !== user.prestador_id) return false;

    const dataServico = new Date(s.created_date);
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    fim.setHours(23, 59, 59, 999);

    const dentroData = dataServico >= inicio && dataServico <= fim;
    const matchStatus = !statusFiltro || s.status_servico === statusFiltro;
    const matchFormaPagamento = !formaPagamentoFiltro || s.forma_pagamento === formaPagamentoFiltro;
    const matchCliente = !clienteFiltro || s.cliente_id === clienteFiltro || 
                         (s.cliente_nome_avulso && s.cliente_nome_avulso.toLowerCase().includes(clienteFiltro.toLowerCase()));

    return dentroData && matchStatus && matchFormaPagamento && matchCliente;
  });

  const getClienteNome = (servico) => {
    if (servico.cliente_nome_avulso) return servico.cliente_nome_avulso;
    const cliente = clientes.find(c => c.id === servico.cliente_id);
    return cliente ? cliente.nome : "N/A";
  };

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor || 0);
  };

  // Estatísticas - SOMENTE SERVIÇOS CONCLUÍDOS
  const servicosConcluidos = meusServicos.filter(s => s.status_servico === "Concluído");
  const totalServicos = meusServicos.length;
  const totalServicosConcluidos = servicosConcluidos.length;
  const servicosAndamento = meusServicos.filter(s => 
    ["Aguardando Aceitação", "Aceito", "Coletado"].includes(s.status_servico)
  ).length;
  
  // COMISSÕES - apenas de serviços concluídos
  const totalComissoes = servicosConcluidos.reduce((sum, s) => sum + (s.comissao_prestador || 0), 0);
  
  // VALOR TOTAL DO FATURAMENTO - apenas de serviços concluídos
  const totalFaturado = servicosConcluidos.reduce((sum, s) => sum + (s.valor_total || 0), 0);
  
  // TICKET MÉDIO - apenas de serviços concluídos
  const ticketMedio = totalServicosConcluidos > 0 ? totalFaturado / totalServicosConcluidos : 0;

  const gerarPDF = async () => {
    const conteudo = `
      <html>
        <head>
          <meta charset="utf-8">
          <title>Relatório do Prestador</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 40px;
              background: #f5f5f5;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              border-bottom: 3px solid #00ff66; 
              padding-bottom: 20px;
              background: white;
              padding: 30px;
              border-radius: 10px;
            }
            .header h1 { 
              color: #00ff66; 
              margin: 0; 
              font-size: 32px;
            }
            .header p { 
              color: #666; 
              margin: 5px 0; 
            }
            .info-box {
              background: white;
              padding: 20px;
              border-radius: 10px;
              margin-bottom: 20px;
              border-left: 4px solid #00ff66;
            }
            .stats { 
              display: grid; 
              grid-template-columns: repeat(3, 1fr); 
              gap: 20px; 
              margin: 30px 0; 
            }
            .stat-box { 
              text-align: center; 
              padding: 20px; 
              background: white; 
              border-radius: 10px; 
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              border-top: 3px solid #00ff66;
            }
            .stat-box .label { 
              color: #666; 
              font-size: 14px; 
              margin-bottom: 10px; 
            }
            .stat-box .value { 
              color: #00ff66; 
              font-size: 28px; 
              font-weight: bold; 
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 20px;
              background: white;
              border-radius: 10px;
              overflow: hidden;
            }
            th, td { 
              padding: 15px; 
              text-align: left; 
              border-bottom: 1px solid #eee; 
            }
            th { 
              background-color: #1a1a1a; 
              color: #00ff66; 
              font-weight: bold;
              text-transform: uppercase;
              font-size: 12px;
            }
            tr:hover { 
              background-color: #f9f9f9; 
            }
            .footer { 
              margin-top: 40px; 
              text-align: center; 
              color: #666; 
              font-size: 12px; 
              border-top: 1px solid #ddd; 
              padding-top: 20px; 
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🏍️ FR Transportes & Serviços</h1>
            <p style="font-size: 20px; font-weight: bold; margin-top: 10px;">Relatório do Prestador</p>
            <p>Período: ${format(parseISO(dataInicio), "dd/MM/yyyy")} a ${format(parseISO(dataFim), "dd/MM/yyyy")}</p>
            <p>Emitido em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}</p>
          </div>

          <div class="info-box">
            <h3 style="margin: 0 0 10px 0; color: #333;">Prestador</h3>
            <p style="font-size: 18px; font-weight: bold; color: #00ff66; margin: 0;">${user?.full_name}</p>
          </div>

          <div class="stats">
            <div class="stat-box">
              <div class="label">Total de Serviços</div>
              <div class="value">${totalServicos}</div>
            </div>
            <div class="stat-box">
              <div class="label">Concluídos</div>
              <div class="value">${totalServicosConcluidos}</div>
            </div>
            <div class="stat-box">
              <div class="label">Em Andamento</div>
              <div class="value">${servicosAndamento}</div>
            </div>
            <div class="stat-box">
              <div class="label">Valor Total Faturado</div>
              <div class="value" style="font-size: 20px;">${formatarMoeda(totalFaturado)}</div>
            </div>
            <div class="stat-box">
              <div class="label">Ticket Médio</div>
              <div class="value" style="font-size: 20px;">${formatarMoeda(ticketMedio)}</div>
            </div>
            <div class="stat-box">
              <div class="label">Minhas Comissões</div>
              <div class="value" style="font-size: 20px;">${formatarMoeda(totalComissoes)}</div>
            </div>
          </div>

          <div style="background: white; padding: 20px; border-radius: 10px; margin-top: 20px;">
            <h2 style="color: #333; border-bottom: 2px solid #00ff66; padding-bottom: 10px;">Detalhamento dos Serviços</h2>
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Nº Pedido</th>
                  <th>Cliente</th>
                  <th>Valor Total</th>
                  <th>Comissão</th>
                  <th>Pagamento</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${meusServicos.map(s => `
                  <tr>
                    <td>${format(new Date(s.created_date), "dd/MM/yyyy")}</td>
                    <td><strong>#${s.numero_pedido || s.id.slice(-5).toUpperCase()}</strong></td>
                    <td>${getClienteNome(s)}</td>
                    <td style="color: #00ff66; font-weight: bold;">${formatarMoeda(s.valor_total)}</td>
                    <td style="color: #00ff66; font-weight: bold;">${formatarMoeda(s.comissao_prestador)}</td>
                    <td><span style="background: #f0f0f0; padding: 4px 8px; border-radius: 4px; font-size: 11px;">${s.forma_pagamento}</span></td>
                    <td><span style="background: ${
                      s.status_servico === "Concluído" ? "#d1fae5" :
                      s.status_servico === "Coletado" ? "#e9d5ff" :
                      s.status_servico === "Aceito" ? "#dbeafe" :
                      "#fef3c7"
                    }; padding: 4px 8px; border-radius: 4px; font-size: 11px;">${s.status_servico}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="footer">
            <p>© 2025 FR Transportes & Serviços - Sistema de Gestão de Fretes</p>
            <p>Este relatório é confidencial e destinado exclusivamente ao prestador</p>
          </div>
        </body>
      </html>
    `;

    const blob = new Blob([conteudo], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-prestador-${format(new Date(), 'yyyy-MM-dd-HHmm')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-4xl font-bold text-white">Meus Relatórios</h2>
          <p className="text-gray-400 mt-2 flex items-center gap-2">
            <FileText className="w-4 h-4 text-green-500" />
            Visualize o desempenho dos seus serviços
          </p>
        </div>
        
        <Button 
          onClick={gerarPDF}
          disabled={meusServicos.length === 0}
          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg"
        >
          <Download className="w-5 h-5 mr-2" />
          Baixar PDF
        </Button>
      </div>

      {/* Filtros */}
      <Card className="shadow-lg border-2 border-green-500/20 bg-gray-800/50 backdrop-blur">
        <CardHeader className="border-b border-green-500/20">
          <CardTitle className="flex items-center gap-2 text-white">
            <Filter className="w-5 h-5 text-green-500" />
            Filtros de Período
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Atalhos */}
          <div>
            <Label className="text-sm font-semibold mb-3 block text-gray-300">Atalhos de Período</Label>
            <div className="flex gap-3 flex-wrap">
              <Button 
                variant="outline" 
                onClick={() => aplicarAtalho('hoje')}
                className="border-green-500/30 text-green-400 hover:bg-green-500/10"
              >
                <CalendarIcon className="w-4 h-4 mr-2" />
                Hoje
              </Button>
              <Button 
                variant="outline" 
                onClick={() => aplicarAtalho('semana')}
                className="border-green-500/30 text-green-400 hover:bg-green-500/10"
              >
                <CalendarIcon className="w-4 h-4 mr-2" />
                Esta Semana
              </Button>
              <Button 
                variant="outline" 
                onClick={() => aplicarAtalho('mes')}
                className="border-green-500/30 text-green-400 hover:bg-green-500/10"
              >
                <CalendarIcon className="w-4 h-4 mr-2" />
                Este Mês
              </Button>
            </div>
          </div>

          {/* Datas e Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Data Início</Label>
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="bg-gray-700 border-green-500/30 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Data Fim</Label>
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="bg-gray-700 border-green-500/30 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Cliente</Label>
              <Select value={clienteFiltro} onValueChange={setClienteFiltro}>
                <SelectTrigger className="bg-gray-700 border-green-500/30 text-white">
                  <SelectValue placeholder="Todos os clientes" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-green-500/30">
                  <SelectItem value={null}>Todos</SelectItem>
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
                <SelectContent className="bg-gray-700 border-green-500/30">
                  <SelectItem value={null}>Todos</SelectItem>
                  <SelectItem value="Aguardando Aceitação">Aguardando Aceitação</SelectItem>
                  <SelectItem value="Aceito">Aceito</SelectItem>
                  <SelectItem value="Coletado">Coletado</SelectItem>
                  <SelectItem value="Concluído">Concluído</SelectItem>
                  <SelectItem value="Cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Forma de Pagamento</Label>
              <Select value={formaPagamentoFiltro} onValueChange={setFormaPagamentoFiltro}>
                <SelectTrigger className="bg-gray-700 border-green-500/30 text-white">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-green-500/30">
                  <SelectItem value={null}>Todas</SelectItem>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="Faturado (Notinha)">Faturado (Notinha)</SelectItem>
                  <SelectItem value="Faturado (Planilha)">Faturado (Planilha)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Estatísticas - DESTAQUE PARA OS INDICADORES PRINCIPAIS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Valor Total do Faturamento - DESTAQUE MÁXIMO */}
        <Card className="border-2 border-green-500/40 bg-gradient-to-br from-green-500/20 to-emerald-600/10 backdrop-blur shadow-2xl hover:shadow-green-500/30 transition-all">
          <CardHeader>
            <CardTitle className="text-sm text-gray-300 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              Valor Total do Faturamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-bold text-green-400">{formatarMoeda(totalFaturado)}</div>
            <p className="text-xs text-gray-400 mt-2">Serviços concluídos no período</p>
          </CardContent>
        </Card>

        {/* Ticket Médio - DESTAQUE MÁXIMO */}
        <Card className="border-2 border-cyan-500/40 bg-gradient-to-br from-cyan-500/20 to-blue-600/10 backdrop-blur shadow-2xl hover:shadow-cyan-500/30 transition-all">
          <CardHeader>
            <CardTitle className="text-sm text-gray-300 flex items-center gap-2">
              <Target className="w-5 h-5 text-cyan-400" />
              Ticket Médio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-bold text-cyan-400">{formatarMoeda(ticketMedio)}</div>
            <p className="text-xs text-gray-400 mt-2">Valor médio por serviço concluído</p>
          </CardContent>
        </Card>

        {/* Minhas Comissões */}
        <Card className="border-2 border-green-500/30 bg-gradient-to-br from-green-500/10 to-emerald-600/5 backdrop-blur hover:shadow-lg hover:shadow-green-500/20 transition-all">
          <CardHeader>
            <CardTitle className="text-sm text-gray-300 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              Minhas Comissões
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-green-400">{formatarMoeda(totalComissoes)}</div>
            <p className="text-xs text-gray-400 mt-2">Total recebido em comissões</p>
          </CardContent>
        </Card>

        {/* Total de Serviços */}
        <Card className="border-2 border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-blue-600/5 backdrop-blur hover:shadow-lg hover:shadow-blue-500/20 transition-all">
          <CardHeader>
            <CardTitle className="text-sm text-gray-300 flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-400" />
              Total de Serviços
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-blue-400">{totalServicos}</div>
            <p className="text-xs text-gray-400 mt-1">No período selecionado</p>
          </CardContent>
        </Card>

        {/* Concluídos */}
        <Card className="border-2 border-green-500/30 bg-gradient-to-br from-green-500/10 to-green-600/5 backdrop-blur hover:shadow-lg hover:shadow-green-500/20 transition-all">
          <CardHeader>
            <CardTitle className="text-sm text-gray-300 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              Concluídos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-green-400">{totalServicosConcluidos}</div>
            <p className="text-xs text-gray-400 mt-1">Serviços finalizados</p>
          </CardContent>
        </Card>

        {/* Em Andamento */}
        <Card className="border-2 border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 backdrop-blur hover:shadow-lg hover:shadow-yellow-500/20 transition-all">
          <CardHeader>
            <CardTitle className="text-sm text-gray-300 flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-400" />
              Em Andamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-yellow-400">{servicosAndamento}</div>
            <p className="text-xs text-gray-400 mt-1">Aguardando conclusão</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Serviços */}
      <Card className="shadow-lg border-2 border-green-500/20 bg-gray-800/50 backdrop-blur">
        <CardHeader className="border-b border-green-500/20">
          <CardTitle className="text-white">Detalhamento dos Serviços</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-green-400 uppercase tracking-wider">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-green-400 uppercase tracking-wider">Nº Pedido</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-green-400 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-green-400 uppercase tracking-wider">Valor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-green-400 uppercase tracking-wider">Comissão</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-green-400 uppercase tracking-wider">Pagamento</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-green-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
                    </td>
                  </tr>
                ) : meusServicos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <FileText className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                      <p className="text-gray-400">Nenhum serviço encontrado no período selecionado</p>
                    </td>
                  </tr>
                ) : (
                  meusServicos.map((servico) => (
                    <tr key={servico.id} className="hover:bg-green-500/5 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {format(new Date(servico.created_date), "dd/MM/yyyy", { locale: ptBR })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          #{servico.numero_pedido || servico.id.slice(-5).toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-white">
                        {getClienteNome(servico)}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-green-400">
                        {formatarMoeda(servico.valor_total)}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-green-400">
                        {formatarMoeda(servico.comissao_prestador)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Badge variant="outline" className="border-gray-600 text-gray-300">
                          {servico.forma_pagamento}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Badge className={
                          servico.status_servico === "Concluído" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                          servico.status_servico === "Coletado" ? "bg-purple-500/20 text-purple-400 border-purple-500/30" :
                          servico.status_servico === "Aceito" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                          "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                        }>
                          {servico.status_servico}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
