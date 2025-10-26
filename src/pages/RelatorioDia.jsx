import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, DollarSign, FileText } from "lucide-react";
import { format, startOfDay, endOfDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function RelatorioDia() {
  const [user, setUser] = useState(null);
  const [dataInicio, setDataInicio] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dataFim, setDataFim] = useState(format(new Date(), 'yyyy-MM-dd'));

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
    queryFn: () => base44.entities.Servico.list('-created_date'),
    enabled: !!user
  });

  const { data: lancamentosPrestador = [] } = useQuery({
    queryKey: ['lancamentosprestador'],
    queryFn: () => base44.entities.LancamentoPrestador.list('-data_lancamento'),
    enabled: !!user
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list()
  });

  // Filtrar dados do prestador logado
  const meusServicos = servicos.filter(s => {
    if (!user?.prestador_id) return false;
    const dataServico = new Date(s.created_date);
    const inicio = startOfDay(parseISO(dataInicio));
    const fim = endOfDay(parseISO(dataFim));
    return s.prestador_id === user.prestador_id && dataServico >= inicio && dataServico <= fim;
  });

  const meusLancamentos = lancamentosPrestador.filter(l => {
    if (!user?.prestador_id) return false;
    const dataLanc = new Date(l.data_lancamento);
    const inicio = startOfDay(parseISO(dataInicio));
    const fim = endOfDay(parseISO(dataFim));
    return l.prestador_id === user.prestador_id && dataLanc >= inicio && dataLanc <= fim;
  });

  const totalServicos = meusServicos.length;
  const totalComissoes = meusServicos.reduce((sum, s) => sum + (s.comissao_prestador || 0), 0);
  const valorBruto = meusServicos.reduce((sum, s) => sum + (s.valor_total || 0), 0);

  const creditos = meusLancamentos.filter(l => l.valor > 0).reduce((sum, l) => sum + l.valor, 0);
  const debitos = meusLancamentos.filter(l => l.valor < 0).reduce((sum, l) => sum + Math.abs(l.valor), 0);
  const saldoFinal = totalComissoes + creditos - debitos;

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

  const gerarPDF = () => {
    const conteudo = `
      <html>
        <head>
          <meta charset="utf-8">
          <title>Relatório do Prestador - ${user?.full_name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #f97316; padding-bottom: 20px; }
            .header h1 { color: #f97316; margin: 0; }
            .resumo { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 30px 0; }
            .resumo-box { text-align: center; padding: 20px; background: #f9f9f9; border-radius: 8px; border: 2px solid #ddd; }
            .resumo-box.positivo { border-color: #10b981; background: #f0fdf4; }
            .resumo-box .label { color: #666; font-size: 14px; margin-bottom: 5px; }
            .resumo-box .valor { font-size: 24px; font-weight: bold; color: #10b981; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #f97316; color: white; font-weight: bold; }
            tr:hover { background-color: #f9f9f9; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Relatório do Prestador</h1>
            <p>${user?.full_name}</p>
            <p>Período: ${format(parseISO(dataInicio), "dd/MM/yyyy")} a ${format(parseISO(dataFim), "dd/MM/yyyy")}</p>
            <p>Emitido em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}</p>
          </div>

          <div class="resumo">
            <div class="resumo-box positivo">
              <div class="label">Total de Serviços</div>
              <div class="valor">${totalServicos}</div>
            </div>
            <div class="resumo-box positivo">
              <div class="label">Total em Comissões</div>
              <div class="valor">${formatarMoeda(totalComissoes)}</div>
            </div>
            <div class="resumo-box">
              <div class="label">Créditos Adicionais</div>
              <div class="valor" style="color: #10b981;">${formatarMoeda(creditos)}</div>
            </div>
            <div class="resumo-box">
              <div class="label">Débitos</div>
              <div class="valor" style="color: #ef4444;">${formatarMoeda(debitos)}</div>
            </div>
          </div>

          <div class="resumo-box positivo" style="max-width: 400px; margin: 20px auto;">
            <div class="label">Saldo Final</div>
            <div class="valor" style="font-size: 32px;">${formatarMoeda(saldoFinal)}</div>
          </div>

          <h2 style="margin-top: 40px; color: #f97316;">Serviços Realizados</h2>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Cliente</th>
                <th>Valor Total</th>
                <th>Comissão</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${meusServicos.map(s => `
                <tr>
                  <td>${format(new Date(s.created_date), "dd/MM/yyyy")}</td>
                  <td>${getClienteNome(s)}</td>
                  <td>${formatarMoeda(s.valor_total)}</td>
                  <td style="color: #10b981; font-weight: bold;">${formatarMoeda(s.comissao_prestador)}</td>
                  <td>${s.status_servico}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          ${meusLancamentos.length > 0 ? `
            <h2 style="margin-top: 40px; color: #f97316;">Outros Lançamentos</h2>
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Descrição</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                ${meusLancamentos.map(l => `
                  <tr>
                    <td>${format(new Date(l.data_lancamento), "dd/MM/yyyy")}</td>
                    <td>${l.tipo}</td>
                    <td>${l.descricao}</td>
                    <td style="color: ${l.valor >= 0 ? '#10b981' : '#ef4444'}; font-weight: bold;">
                      ${l.valor >= 0 ? '+' : ''} ${formatarMoeda(Math.abs(l.valor))}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}

          <div style="margin-top: 40px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px;">
            <p>© 2025 Base44 - Sistema de Gestão de Fretes</p>
          </div>
        </body>
      </html>
    `;

    const blob = new Blob([conteudo], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-${format(new Date(), 'yyyy-MM-dd')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Relatórios</h2>
          <p className="text-gray-500 mt-1">Visualize seu desempenho e ganhos</p>
        </div>
        
        <Button 
          onClick={gerarPDF}
          disabled={totalServicos === 0}
          className="bg-gradient-to-r from-orange-500 to-red-500"
        >
          <Download className="w-5 h-5 mr-2" />
          Emitir PDF
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader className="border-b bg-gradient-to-r from-orange-50 to-red-50">
          <CardTitle>Filtrar Período</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Data Início</Label>
              <Input 
                type="date" 
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Data Fim</Label>
              <Input 
                type="date" 
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50">
          <CardHeader>
            <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Total de Serviços
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-blue-600">{totalServicos}</div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
          <CardHeader>
            <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Valor Bruto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{formatarMoeda(valorBruto)}</div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-red-50">
          <CardHeader>
            <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Comissões
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{formatarMoeda(totalComissoes)}</div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardHeader>
            <CardTitle className="text-sm text-gray-600">Saldo Final</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${saldoFinal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatarMoeda(saldoFinal)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg">
        <CardHeader className="border-b bg-gradient-to-r from-orange-50 to-red-50">
          <CardTitle>Detalhamento de Comissões</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Comissão</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
                    </td>
                  </tr>
                ) : meusServicos.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      Nenhum serviço encontrado no período selecionado
                    </td>
                  </tr>
                ) : (
                  meusServicos.map((servico) => (
                    <tr key={servico.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {format(new Date(servico.created_date), "dd/MM/yyyy", { locale: ptBR })}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        {getClienteNome(servico)}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-blue-600">
                        {formatarMoeda(servico.valor_total)}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-green-600">
                        {formatarMoeda(servico.comissao_prestador)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Badge className={
                          servico.status_servico === "Concluído" ? "bg-green-100 text-green-800" :
                          servico.status_servico === "Coletado" ? "bg-purple-100 text-purple-800" :
                          servico.status_servico === "Aceito" ? "bg-blue-100 text-blue-800" :
                          "bg-yellow-100 text-yellow-800"
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

      {meusLancamentos.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader className="border-b bg-gradient-to-r from-orange-50 to-red-50">
            <CardTitle>Outros Lançamentos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {meusLancamentos.map((lanc) => (
                    <tr key={lanc.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {format(new Date(lanc.data_lancamento), "dd/MM/yyyy", { locale: ptBR })}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Badge variant="outline">{lanc.tipo}</Badge>
                      </td>
                      <td className="px-6 py-4 text-sm">{lanc.descricao}</td>
                      <td className="px-6 py-4 text-sm font-semibold">
                        <span className={lanc.valor >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {lanc.valor >= 0 ? '+' : ''} {formatarMoeda(Math.abs(lanc.valor))}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}