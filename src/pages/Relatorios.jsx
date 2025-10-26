
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Filter, Calendar, TrendingUp, DollarSign, Package, BarChart3 } from "lucide-react";
import { format, startOfDay, endOfDay, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Relatorios() {
  const hoje = new Date();
  const [dataInicio, setDataInicio] = useState(format(hoje, 'yyyy-MM-dd'));
  const [dataFim, setDataFim] = useState(format(hoje, 'yyyy-MM-dd'));
  const [clienteFiltro, setClienteFiltro] = useState("");
  const [prestadorFiltro, setPrestadorFiltro] = useState("");
  const [formaPagamentoFiltro, setFormaPagamentoFiltro] = useState("");
  const [statusServicoFiltro, setStatusServicoFiltro] = useState("");
  const [statusPagamentoFiltro, setStatusPagamentoFiltro] = useState("");

  const { data: servicos = [], isLoading } = useQuery({
    queryKey: ['servicos'],
    queryFn: () => base44.entities.Servico.list('-created_date'),
    refetchInterval: 10000 // ✅ Atualização automática
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list('nome'),
    refetchInterval: 10000 // ✅ Atualização automática
  });

  const { data: prestadores = [] } = useQuery({
    queryKey: ['prestadores'],
    queryFn: () => base44.entities.Prestador.list('nome'),
    refetchInterval: 10000 // ✅ Atualização automática
  });

  const { data: lancamentos = [] } = useQuery({
    queryKey: ['lancamentos'],
    queryFn: () => base44.entities.Lancamento.list('-data_lancamento'),
    refetchInterval: 10000 // ✅ Atualização automática
  });

  const aplicarAtalho = (tipo) => {
    const hoje = new Date();
    switch(tipo) {
      case 'hoje':
        setDataInicio(format(hoje, 'yyyy-MM-dd'));
        setDataFim(format(hoje, 'yyyy-MM-dd'));
        break;
      case 'semana':
        setDataInicio(format(startOfWeek(hoje, { locale: ptBR }), 'yyyy-MM-dd'));
        setDataFim(format(endOfWeek(hoje, { locale: ptBR }), 'yyyy-MM-dd'));
        break;
      case 'mes':
        setDataInicio(format(startOfMonth(hoje), 'yyyy-MM-dd'));
        setDataFim(format(endOfMonth(hoje), 'yyyy-MM-dd'));
        break;
    }
  };

  const servicosFiltrados = servicos.filter(s => {
    const dataServico = new Date(s.created_date);
    const inicio = startOfDay(parseISO(dataInicio));
    const fim = endOfDay(parseISO(dataFim));
    
    const dentroData = dataServico >= inicio && dataServico <= fim;
    const matchCliente = !clienteFiltro || s.cliente_id === clienteFiltro || s.cliente_nome_avulso?.toLowerCase().includes(clienteFiltro.toLowerCase());
    const matchPrestador = !prestadorFiltro || s.prestador_id === prestadorFiltro;
    const matchFormaPagamento = !formaPagamentoFiltro || s.forma_pagamento === formaPagamentoFiltro;
    const matchStatusServico = !statusServicoFiltro || s.status_servico === statusServicoFiltro;
    const matchStatusPagamento = !statusPagamentoFiltro || s.status_pagamento === statusPagamentoFiltro;

    return dentroData && matchCliente && matchPrestador && matchFormaPagamento && matchStatusServico && matchStatusPagamento;
  });

  const lancamentosFiltrados = lancamentos.filter(l => {
    const dataLanc = new Date(l.data_lancamento);
    const inicio = startOfDay(parseISO(dataInicio));
    const fim = endOfDay(parseISO(dataFim));
    return dataLanc >= inicio && dataLanc <= fim;
  });

  const totalServicos = servicosFiltrados.length;
  const valorTotal = servicosFiltrados.reduce((sum, s) => sum + (s.valor_total || 0), 0);
  const ticketMedio = totalServicos > 0 ? valorTotal / totalServicos : 0;
  
  const totalComissoes = servicosFiltrados.reduce((sum, s) => sum + (s.comissao_prestador || 0), 0);
  const totalReceitas = lancamentosFiltrados.filter(l => l.tipo === "Receita").reduce((sum, l) => sum + (l.valor || 0), 0);
  const totalDespesas = lancamentosFiltrados.filter(l => l.tipo === "Despesa").reduce((sum, l) => sum + (l.valor || 0), 0);
  const lucroLiquido = totalReceitas - totalDespesas - totalComissoes;

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

  const gerarPDF = async () => {
    const conteudo = `
      <html>
        <head>
          <meta charset="utf-8">
          <title>Relatório FR Transportes</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; background: #f5f5f5; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #00ff66; padding-bottom: 20px; background: white; padding: 30px; border-radius: 10px; }
            .header h1 { color: #00ff66; margin: 0; }
            .header p { color: #666; margin: 5px 0; }
            .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 30px 0; }
            .stat-box { text-align: center; padding: 20px; background: #fff; border-radius: 8px; border-top: 3px solid #00ff66; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .stat-box .label { color: #666; font-size: 14px; margin-bottom: 5px; }
            .stat-box .value { color: #00ff66; font-size: 24px; font-weight: bold; }
            
            .section { margin-top: 40px; background: white; padding: 20px; border-radius: 10px; }
            .section h2 { color: #00ff66; border-bottom: 2px solid #00ff66; padding-bottom: 10px; margin-bottom: 20px; }
            
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #1a1a1a; color: #00ff66; font-weight: bold; }
            tr:hover { background-color: #f9f9f9; }
            tr:nth-child(even) { background-color: #f5f5f5; }
            
            .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px; }
            
            .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 20px 0; }
            .summary-item { padding: 15px; background: #f9f9f9; border-radius: 8px; border-left: 4px solid #00ff66; }
            .summary-item .title { color: #666; font-size: 14px; margin-bottom: 5px; }
            .summary-item .value { color: #333; font-size: 20px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🏍️ FR Transportes & Serviços</h1>
            <p>Relatório Completo de Operações</p>
            <p>Período: ${format(parseISO(dataInicio), "dd/MM/yyyy", { locale: ptBR })} a ${format(parseISO(dataFim), "dd/MM/yyyy", { locale: ptBR })}</p>
            <p>Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
          </div>

          <div class="stats">
            <div class="stat-box">
              <div class="label">Total de Serviços</div>
              <div class="value">${totalServicos}</div>
            </div>
            <div class="stat-box">
              <div class="label">Valor Total Bruto</div>
              <div class="value">${formatarMoeda(valorTotal)}</div>
            </div>
            <div class="stat-box">
              <div class="label">Ticket Médio</div>
              <div class="value">${formatarMoeda(ticketMedio)}</div>
            </div>
          </div>

          <div class="section">
            <h2>Resumo Financeiro</h2>
            <div class="summary-grid">
              <div class="summary-item">
                <div class="title">Receitas do Período</div>
                <div class="value" style="color: #10b981;">${formatarMoeda(totalReceitas)}</div>
              </div>
              <div class="summary-item">
                <div class="title">Despesas do Período</div>
                <div class="value" style="color: #ef4444;">${formatarMoeda(totalDespesas)}</div>
              </div>
              <div class="summary-item">
                <div class="title">Total em Comissões</div>
                <div class="value" style="color: #00ff66;">${formatarMoeda(totalComissoes)}</div>
              </div>
              <div class="summary-item">
                <div class="title">Lucro Líquido</div>
                <div class="value" style="color: ${lucroLiquido >= 0 ? '#10b981' : '#ef4444'};">${formatarMoeda(lucroLiquido)}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <h2>Detalhamento dos Serviços</h2>
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Cliente</th>
                  <th>Prestador</th>
                  <th>Valor</th>
                  <th>Comissão</th>
                  <th>Pagamento</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${servicosFiltrados.map(s => `
                  <tr>
                    <td>${format(new Date(s.created_date), "dd/MM/yyyy", { locale: ptBR })}</td>
                    <td>${getClienteNome(s)}</td>
                    <td>${s.prestador_nome}</td>
                    <td>${formatarMoeda(s.valor_total)}</td>
                    <td>${formatarMoeda(s.comissao_prestador)}</td>
                    <td>${s.forma_pagamento}</td>
                    <td>${s.status_servico}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <h2>Ranking de Prestadores</h2>
            <table>
              <thead>
                <tr>
                  <th>Posição</th>
                  <th>Prestador</th>
                  <th>Serviços Realizados</th>
                  <th>Valor Total</th>
                  <th>Comissões Recebidas</th>
                </tr>
              </thead>
              <tbody>
                ${prestadores.map((p, index) => {
                  const servicosPrest = servicosFiltrados.filter(s => s.prestador_id === p.id);
                  const totalServ = servicosPrest.length;
                  const valorPrest = servicosPrest.reduce((sum, s) => sum + (s.valor_total || 0), 0);
                  const comissaoPrest = servicosPrest.reduce((sum, s) => sum + (s.comissao_prestador || 0), 0);
                  
                  if (totalServ === 0) return '';
                  
                  return `
                    <tr>
                      <td>${index + 1}°</td>
                      <td>${p.nome}</td>
                      <td>${totalServ}</td>
                      <td>${formatarMoeda(valorPrest)}</td>
                      <td>${formatarMoeda(comissaoPrest)}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <div class="footer">
            <p>© 2025 FR Transportes & Serviços - Sistema de Gestão de Fretes</p>
            <p>Este relatório foi gerado automaticamente pelo sistema e contém informações confidenciais</p>
          </div>
        </body>
      </html>
    `;

    const blob = new Blob([conteudo], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-fr-${format(new Date(), 'yyyy-MM-dd-HHmm')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-4xl font-bold text-white flex items-center gap-3">
            <BarChart3 className="w-10 h-10 text-green-500" />
            Relatórios
          </h2>
          <p className="text-gray-400 mt-2">Gere relatórios detalhados com filtros avançados</p>
        </div>
        
        <Button 
          onClick={gerarPDF}
          disabled={servicosFiltrados.length === 0}
          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg"
        >
          <Download className="w-5 h-5 mr-2" />
          Emitir PDF Completo
        </Button>
      </div>

      <Card className="border-2 border-green-500/20 bg-gray-800/50 backdrop-blur shadow-xl">
        <CardHeader className="border-b border-green-500/20 bg-gray-800/30">
          <CardTitle className="flex items-center gap-2 text-white">
            <Filter className="w-5 h-5 text-green-500" />
            Filtros de Relatório
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div>
            <Label className="text-sm font-semibold mb-3 block text-gray-300">Atalhos de Período</Label>
            <div className="flex gap-3 flex-wrap">
              <Button 
                variant="outline" 
                onClick={() => aplicarAtalho('hoje')}
                className="border-green-500/30 text-green-400 hover:bg-green-500/10"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Hoje
              </Button>
              <Button 
                variant="outline" 
                onClick={() => aplicarAtalho('semana')}
                className="border-green-500/30 text-green-400 hover:bg-green-500/10"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Esta Semana
              </Button>
              <Button 
                variant="outline" 
                onClick={() => aplicarAtalho('mes')}
                className="border-green-500/30 text-green-400 hover:bg-green-500/10"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Este Mês
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
              <Label className="text-gray-300">Prestador</Label>
              <Select value={prestadorFiltro} onValueChange={setPrestadorFiltro}>
                <SelectTrigger className="bg-gray-700 border-green-500/30 text-white">
                  <SelectValue placeholder="Todos os prestadores" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-green-500/30">
                  <SelectItem value={null}>Todos</SelectItem>
                  {prestadores.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Forma de Pagamento</Label>
              <Select value={formaPagamentoFiltro} onValueChange={setFormaPagamentoFiltro}>
                <SelectTrigger className="bg-gray-700 border-green-500/30 text-white">
                  <SelectValue placeholder="Todas as formas" />
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

            <div className="space-y-2">
              <Label className="text-gray-300">Status do Serviço</Label>
              <Select value={statusServicoFiltro} onValueChange={setStatusServicoFiltro}>
                <SelectTrigger className="bg-gray-700 border-green-500/30 text-white">
                  <SelectValue placeholder="Todos os status" />
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
              <Label className="text-gray-300">Status do Pagamento</Label>
              <Select value={statusPagamentoFiltro} onValueChange={setStatusPagamentoFiltro}>
                <SelectTrigger className="bg-gray-700 border-green-500/30 text-white">
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-green-500/30">
                  <SelectItem value={null}>Todos</SelectItem>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Pago">Pago</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-2 border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 hover:shadow-lg hover:shadow-blue-500/20 transition-all">
          <CardHeader>
            <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-500" />
              Total de Serviços
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-blue-400">{totalServicos}</div>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-500/30 bg-gradient-to-br from-green-500/10 to-emerald-500/10 hover:shadow-lg hover:shadow-green-500/20 transition-all">
          <CardHeader>
            <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-500" />
              Valor Total Bruto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-400">{formatarMoeda(valorTotal)}</div>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-pink-500/10 hover:shadow-lg hover:shadow-purple-500/20 transition-all">
          <CardHeader>
            <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-500" />
              Ticket Médio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-400">{formatarMoeda(ticketMedio)}</div>
          </CardContent>
        </Card>

        <Card className="border-2 border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 hover:shadow-lg hover:shadow-cyan-500/20 transition-all">
          <CardHeader>
            <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-cyan-500" />
              Lucro Líquido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${lucroLiquido >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
              {formatarMoeda(lucroLiquido)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-2 border-green-500/20 bg-gray-800/50 backdrop-blur shadow-xl">
        <CardHeader className="border-b border-green-500/20 bg-gray-800/30">
          <CardTitle className="text-white">Detalhamento dos Serviços</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-green-400 uppercase tracking-wider">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-green-400 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-green-400 uppercase tracking-wider">Prestador</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-green-400 uppercase tracking-wider">Valor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-green-400 uppercase tracking-wider">Pagamento</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-green-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
                    </td>
                  </tr>
                ) : servicosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <FileText className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                      <p className="text-gray-500">Nenhum serviço encontrado com os filtros selecionados</p>
                    </td>
                  </tr>
                ) : (
                  servicosFiltrados.map((servico) => (
                    <tr key={servico.id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {format(new Date(servico.created_date), "dd/MM/yyyy", { locale: ptBR })}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-white">
                        {getClienteNome(servico)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">{servico.prestador_nome}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-green-400">
                        {formatarMoeda(servico.valor_total)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Badge variant="outline" className="border-gray-600 text-gray-300">{servico.forma_pagamento}</Badge>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Badge className={
                          servico.status_servico === "Concluído" ? "bg-green-500/20 text-green-300 border-green-500/30" :
                          servico.status_servico === "Coletado" ? "bg-purple-500/20 text-purple-300 border-purple-500/30" :
                          servico.status_servico === "Aceito" ? "bg-blue-500/20 text-blue-300 border-blue-500/30" :
                          "bg-gray-500/20 text-gray-300 border-gray-500/30"
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
