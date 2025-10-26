
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronDown,
  ChevronUp,
  User,
  Calendar, // This is the CalendarIcon
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  Filter,
  Wallet,
  Plus,
  Download,
  FileText,
  Edit,
  CheckCircle,
  Trash2,
  History,
  RotateCcw,
  Eye,
  ShoppingBag, // Added for getTipoIcon
  Landmark,    // Added for getTipoIcon
  Receipt      // Added for getTipoIcon
} from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } from "date-fns"; // Added parseISO
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom"; // Changed from 'next/link'
import { createPageUrl } from "@/utils"; // Added new import

export default function CaixaPrestadores() {
  const [prestadorExpandido, setPrestadorExpandido] = useState(null);
  const [dataInicio, setDataInicio] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dataFim, setDataFim] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dialogLancamento, setDialogLancamento] = useState(false);
  const [dialogEdicao, setDialogEdicao] = useState(false);
  const [dialogQuitacoes, setDialogQuitacoes] = useState(false); // New state for Quitações dialog
  const [dialogDetalhesQuitacao, setDialogDetalhesQuitacao] = useState(false); // New state for Detalhes Quitação dialog
  const [quitacaoSelecionada, setQuitacaoSelecionada] = useState(null); // New state for selected Quitacao
  const [prestadorSelecionado, setPrestadorSelecionado] = useState(null);
  const [lancamentoSelecionado, setLancamentoSelecionado] = useState(null);
  const [formData, setFormData] = useState({
    prestador_id: "",
    tipo: "Vale",
    descricao: "",
    valor: "", // Changed to string for formatted input
    data_lancamento: format(new Date(), 'yyyy-MM-dd'),
    data_vencimento: "", // Added data_vencimento
    status_pagamento: "Pendente",
    observacoes: "",
    recorrente: false,
    periodicidade: "Mensal",
    parcelas: 1,
    incluir_financeiro_geral: false // Added new field
  });

  const queryClient = useQueryClient();

  const { data: lancamentos = [], isLoading: loadingLancamentos } = useQuery({
    queryKey: ['lancamentosprestador'],
    queryFn: async () => {
      try {
        return await base44.entities.LancamentoPrestador.list('-data_lancamento');
      } catch (error) {
        console.error("Erro ao carregar lançamentos:", error);
        return [];
      }
    },
    refetchInterval: 5000 // ✅ Atualização automática
  });

  const { data: servicos = [] } = useQuery({
    queryKey: ['servicos'],
    queryFn: () => base44.entities.Servico.list('-created_date'),
    refetchInterval: 5000 // ✅ Atualização automática
  });

  const { data: prestadores = [] } = useQuery({
    queryKey: ['prestadores'],
    queryFn: async () => {
      try {
        return await base44.entities.Prestador.list();
      } catch (error) {
        console.error("Erro ao carregar prestadores:", error);
        return [];
      }
    },
    refetchInterval: 10000 // ✅ Atualização automática
  });

  // New query for Quitações
  const { data: quitacoes = [] } = useQuery({
    queryKey: ['quitacoes'],
    queryFn: async () => {
      try {
        return await base44.entities.QuitacaoPrestador.list('-data_quitacao');
      } catch (error) {
        console.error("Erro ao carregar quitações:", error);
        return [];
      }
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const prestador = prestadores.find(p => p.id === data.prestador_id);
      const dataComNome = {
        ...data,
        prestador_nome: prestador?.nome,
        data_vencimento: data.data_vencimento || null // Convert empty string to null for API
      };

      if (data.recorrente && data.parcelas > 1) {
        // Create the first installment/parent
        const lancamentoPai = await base44.entities.LancamentoPrestador.create(dataComNome);

        const dataBase = new Date(data.data_lancamento);
        const dataVencimentoBase = data.data_vencimento ? new Date(data.data_vencimento) : null;
        const parcelasArray = [];

        for (let i = 1; i < data.parcelas; i++) {
          const novaDataLancamento = new Date(dataBase);
          const novaDataVencimento = dataVencimentoBase ? new Date(dataVencimentoBase) : null;

          if (data.periodicidade === "Mensal") {
            novaDataLancamento.setMonth(dataBase.getMonth() + i);
            if (novaDataVencimento) novaDataVencimento.setMonth(dataVencimentoBase.getMonth() + i);
          } else if (data.periodicidade === "Quinzenal") {
            novaDataLancamento.setDate(dataBase.getDate() + (i * 15));
            if (novaDataVencimento) novaDataVencimento.setDate(dataVencimentoBase.getDate() + (i * 15));
          } else if (data.periodicidade === "Semanal") {
            novaDataLancamento.setDate(dataBase.getDate() + (i * 7));
            if (novaDataVencimento) novaDataVencimento.setDate(dataVencimentoBase.getDate() + (i * 7));
          }

          parcelasArray.push({
            ...dataComNome,
            data_lancamento: format(novaDataLancamento, 'yyyy-MM-dd'),
            data_vencimento: novaDataVencimento ? format(novaDataVencimento, 'yyyy-MM-dd') : null,
            descricao: `${data.descricao} (Parcela ${i + 1}/${data.parcelas})`,
            // Recurrent installments generally start as pending
            status_pagamento: "Pendente",
          });
        }

        if (parcelasArray.length > 0) {
          await base44.entities.LancamentoPrestador.bulkCreate(parcelasArray);
        }

        return lancamentoPai;
      } else {
        return base44.entities.LancamentoPrestador.create(dataComNome);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['lancamentosprestador']);
      setDialogLancamento(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LancamentoPrestador.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['lancamentosprestador']);
      setDialogEdicao(false);
      setLancamentoSelecionado(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LancamentoPrestador.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['lancamentosprestador']);
    }
  });

  // New mutation to revert a quitacão
  const reverterQuitacao = useMutation({
    mutationFn: async (quitacao) => {
      // Excluir o lançamento de pagamento associado, se existir
      if (quitacao.lancamento_pagamento_id) {
        await base44.entities.LancamentoPrestador.delete(quitacao.lancamento_pagamento_id);
      }

      // Marcar a quitação como revertida (não a removemos para manter histórico)
      await base44.entities.QuitacaoPrestador.update(quitacao.id, {
        revertida: true,
        data_reversao: new Date().toISOString() // Store the reversion date
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['lancamentosprestador']); // Update lanceramentos
      queryClient.invalidateQueries(['quitacoes']); // Update quitacões list
      setDialogDetalhesQuitacao(false);
      setQuitacaoSelecionada(null);
      alert("Quitação revertida com sucesso! O lançamento de pagamento foi excluído.");
    },
    onError: (error) => {
      console.error("Erro ao reverter quitação:", error);
      alert("Erro ao reverter quitação. Tente novamente.");
    }
  });

  const resetForm = () => {
    setFormData({
      prestador_id: "",
      tipo: "Vale",
      descricao: "",
      valor: "",
      data_lancamento: format(new Date(), 'yyyy-MM-dd'),
      data_vencimento: "", // Added data_vencimento
      status_pagamento: "Pendente",
      observacoes: "",
      recorrente: false,
      periodicidade: "Mensal",
      parcelas: 1,
      incluir_financeiro_geral: false // Reset new field
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const parsedValor = parseFloat(formData.valor.replace(',', '.')); // Parse string value
    if (isNaN(parsedValor)) {
      alert("Por favor, insira um valor numérico válido.");
      return;
    }
    const dataToSend = {
      ...formData,
      valor: formData.tipo === "Comissão" || formData.tipo === "Receita"
        ? parsedValor
        : -Math.abs(parsedValor),
      status_pagamento: formData.tipo === "Comissão" ? "Pago" : formData.status_pagamento, // Commissions are always paid
      data_vencimento: formData.data_vencimento || null // Convert empty string to null for API
    };
    createMutation.mutate(dataToSend);
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    const parsedValor = parseFloat(String(lancamentoSelecionado.valor).replace(',', '.')); // Parse string value
    if (isNaN(parsedValor)) {
      alert("Por favor, insira um valor numérico válido.");
      return;
    }
    const dataToSend = {
      ...lancamentoSelecionado,
      valor: lancamentoSelecionado.tipo === "Comissão" || lancamentoSelecionado.tipo === "Receita"
        ? parsedValor
        : -Math.abs(parsedValor),
      data_vencimento: lancamentoSelecionado.data_vencimento || null // Convert empty string to null for API
    };
    updateMutation.mutate({ id: lancamentoSelecionado.id, data: dataToSend });
  };

  const abrirNovoLancamento = (prestador = null) => {
    resetForm();
    if (prestador) {
      setFormData(prev => ({ ...prev, prestador_id: prestador.id }));
      setPrestadorSelecionado(prestador);
    } else {
      setPrestadorSelecionado(null); // Clear selected prestador if opening for general launch
    }
    setDialogLancamento(true);
  };

  const abrirEdicao = (lancamento) => {
    // Ensure value is formatted correctly for the input field (string "X,XX")
    setLancamentoSelecionado({
      ...lancamento,
      valor: Math.abs(lancamento.valor || 0).toFixed(2).replace('.', ','),
      data_vencimento: lancamento.data_vencimento || "" // Ensure empty string for null
    });
    setDialogEdicao(true);
  };

  const darBaixa = (lancamento) => {
    const novoStatus = lancamento.status_pagamento === "Pago" ? "Pendente" : "Pago";
    updateMutation.mutate({
      id: lancamento.id,
      data: { ...lancamento, status_pagamento: novoStatus }
    });
  };

  const handleExcluir = (lancamento) => {
    // Removed the specific check for "Comissão" type to allow deletion
    if (window.confirm(`Tem certeza que deseja excluir o lançamento "${lancamento.descricao}" (ID: ${lancamento.id})?`)) {
      deleteMutation.mutate(lancamento.id);
    }
  };

  const quitarPeriodo = async (resumo) => {
    if (resumo.saldo === 0) {
      alert("O saldo deste período já está zerado.");
      return;
    }

    if (!window.confirm(`Tem certeza que deseja quitar o período de ${format(new Date(dataInicio), "dd/MM/yyyy")} a ${format(new Date(dataFim), "dd/MM/yyyy")} para ${resumo.prestador.nome}?\n\nSaldo atual: ${formatarMoeda(resumo.saldo)}\n\nSerá criado um lançamento de pagamento que zerará este saldo.`)) {
      return;
    }

    try {
      // 1. Criar o lançamento de pagamento que zera o saldo
      const lancamentoPagamento = await base44.entities.LancamentoPrestador.create({
        prestador_id: resumo.prestador.id,
        prestador_nome: resumo.prestador.nome,
        tipo: "Pagamento",
        descricao: `Pagamento de Saldo do Período (${format(new Date(dataInicio), "dd/MM/yyyy")} - ${format(new Date(dataFim), "dd/MM/yyyy")})`,
        valor: -Math.abs(resumo.saldo), // Create a payment to zero out the balance
        data_lancamento: format(new Date(), 'yyyy-MM-dd'),
        status_pagamento: "Pago",
        observacoes: `Quitação automática do período. Saldo anterior: ${formatarMoeda(resumo.saldo)}`,
        incluir_financeiro_geral: false // Default to false for these auto-generated settlements
      });

      // 2. Registrar a quitação no novo histórico de quitações
      await base44.entities.QuitacaoPrestador.create({
        prestador_id: resumo.prestador.id,
        prestador_nome: resumo.prestador.nome,
        data_quitacao: format(new Date(), 'yyyy-MM-dd'),
        periodo_inicio: dataInicio,
        periodo_fim: dataFim,
        saldo_quitado: resumo.saldo,
        // Armazenar os IDs de todos os lançamentos que foram considerados para este resumo
        lancamentos_ids: resumo.lancamentos.map(l => l.id),
        lancamento_pagamento_id: lancamentoPagamento.id, // Referência ao lançamento de pagamento
        observacoes: `Quitação automática de ${resumo.lancamentos.length} lançamentos do período.`
      });

      queryClient.invalidateQueries(['lancamentosprestador']);
      queryClient.invalidateQueries(['quitacoes']); // Invalidate new query
      alert("Período quitado com sucesso! Um lançamento de 'Pagamento' foi criado para zerar o saldo.");
    } catch (error) {
      console.error("Erro ao quitar período:", error);
      alert("Erro ao quitar período. Tente novamente.");
    }
  };

  const aplicarAtalho = (tipo) => {
    const hoje = new Date();
    if (tipo === 'semana') {
      setDataInicio(format(startOfWeek(hoje, { weekStartsOn: 0 }), 'yyyy-MM-dd'));
      setDataFim(format(endOfWeek(hoje, { weekStartsOn: 0 }), 'yyyy-MM-dd'));
    } else if (tipo === 'mes') {
      setDataInicio(format(startOfMonth(hoje), 'yyyy-MM-dd'));
      setDataFim(format(endOfMonth(hoje), 'yyyy-MM-dd'));
    } else if (tipo === 'quinzena') {
      const dia = hoje.getDate();
      if (dia <= 15) {
        setDataInicio(format(new Date(hoje.getFullYear(), hoje.getMonth(), 1), 'yyyy-MM-dd'));
        setDataFim(format(new Date(hoje.getFullYear(), hoje.getMonth(), 15), 'yyyy-MM-dd'));
      } else {
        setDataInicio(format(new Date(hoje.getFullYear(), hoje.getMonth(), 16), 'yyyy-MM-dd'));
        setDataFim(format(endOfMonth(hoje), 'yyyy-MM-dd'));
      }
    }
  };

  // FILTRAR LANÇAMENTOS DENTRO DO PERÍODO
  const lancamentosFiltrados = lancamentos.filter(l => {
    const dataLanc = new Date(l.data_lancamento);
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    fim.setHours(23, 59, 59, 999);
    return dataLanc >= inicio && dataLanc <= fim;
  });

  const resumoPorPrestador = prestadores.map(p => {
    const lancsPrestador = lancamentosFiltrados.filter(l => l.prestador_id === p.id);

    // SOMAR APENAS LANÇAMENTOS PAGOS E NÃO CANCELADOS
    const comissoes = lancsPrestador
      .filter(l => l.tipo === "Comissão" && l.status_pagamento === "Pago" && servicos.find(s => s.id === l.servico_id)?.status_servico !== "Cancelado")
      .reduce((sum, l) => sum + (l.valor || 0), 0);

    const receitas = lancsPrestador
      .filter(l => l.tipo === "Receita" && l.status_pagamento === "Pago")
      .reduce((sum, l) => sum + (l.valor || 0), 0);

    const vales = lancsPrestador
      .filter(l => l.tipo === "Vale" && l.status_pagamento === "Pago")
      .reduce((sum, l) => sum + Math.abs(l.valor || 0), 0);

    const debitos = lancsPrestador
      .filter(l => ["Despesa", "Débito"].includes(l.tipo) && l.status_pagamento === "Pago")
      .reduce((sum, l) => sum + Math.abs(l.valor || 0), 0);

    const pagamentos = lancsPrestador
      .filter(l => l.tipo === "Pagamento" && l.status_pagamento === "Pago")
      .reduce((sum, l) => sum + Math.abs(l.valor || 0), 0);

    // Saldo = Comissões + Receitas - Vales - Débitos - Pagamentos
    const saldo = comissoes + receitas - vales - debitos - pagamentos;

    const lancamentosPagos = lancsPrestador.filter(l => l.status_pagamento === "Pago").length;
    const lancamentosPendentes = lancsPrestador.filter(l => l.status_pagamento === "Pendente").length;

    return {
      prestador: p,
      lancamentos: lancsPrestador,
      comissoes,
      receitas,
      vales,
      debitos,
      pagamentos,
      saldo,
      lancamentosPagos,
      lancamentosPendentes
    };
  }).filter(r => r.lancamentos.length > 0 || quitacoes.some(q => q.prestador_id === r.prestador.id && !q.revertida))
    .sort((a, b) => a.prestador.nome.localeCompare(b.prestador.nome, 'pt-BR'));

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(valor || 0);
  };

  const gerarPDFPrestador = (resumo) => {
    const conteudo = `
      <html>
        <head>
          <meta charset="utf-8">
          <title>Relatório de Caixa - ${resumo.prestador.nome}</title>
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
            .info-box {
              background: white;
              padding: 20px;
              border-radius: 10px;
              margin-bottom: 20px;
              border-left: 4px solid #00ff66;
            }
            .stats {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
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
            .saldo-box {
              background: linear-gradient(135deg, #00ff66, #00cc52);
              color: white;
              padding: 30px;
              border-radius: 10px;
              text-align: center;
              margin: 20px 0;
            }
            .saldo-box .label {
              font-size: 18px;
              margin-bottom: 10px;
            }
            .saldo-box .value {
              font-size: 48px;
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
            <p style="font-size: 20px; font-weight: bold; margin-top: 10px;">Relatório de Caixa</p>
            <p>Período: ${format(new Date(dataInicio), "dd/MM/yyyy")} a ${format(new Date(dataFim), "dd/MM/yyyy")}</p>
            <p>Emitido em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}</p>
          </div>

          <div class="info-box">
            <h3 style="margin: 0 0 10px 0; color: #333;">Prestador</h3>
            <p style="font-size: 18px; font-weight: bold; color: #00ff66; margin: 0;">${resumo.prestador.nome}</p>
            <p style="font-size: 14px; color: #666; margin: 5px 0 0 0;">${resumo.prestador.tipo_servico}</p>
          </div>

          <div class="saldo-box">
            <div class="label">Saldo do Período (Valores Pagos)</div>
            <div class="value">${formatarMoeda(resumo.saldo)}</div>
          </div>

          <div class="stats">
            <div class="stat-box">
              <div class="label">Comissões Pagas</div>
              <div class="value">${formatarMoeda(resumo.comissoes)}</div>
            </div>
            <div class="stat-box">
              <div class="label">Receitas Pagas</div>
              <div class="value">${formatarMoeda(resumo.receitas)}</div>
            </div>
            <div class="stat-box">
              <div class="label">Vales Pagos</div>
              <div class="value">${formatarMoeda(resumo.vales)}</div>
            </div>
            <div class="stat-box">
              <div class="label">Débitos/Despesas Pagos</div>
              <div class="value">${formatarMoeda(resumo.debitos)}</div>
            </div>
            <div class="stat-box">
              <div class="label">Pagamentos</div>
              <div class="value">${formatarMoeda(resumo.pagamentos)}</div>
            </div>
          </div>

          <div style="background: white; padding: 20px; border-radius: 10px; margin-top: 20px;">
            <h2 style="color: #333; border-bottom: 2px solid #00ff66; padding-bottom: 10px;">Detalhamento dos Lançamentos</h2>
            <table>
              <thead>
                <tr>
                  <th>Data Lanç.</th>
                  <th>Data Venc.</th>
                  <th>Tipo</th>
                  <th>Descrição</th>
                  <th>Valor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${resumo.lancamentos.map(lanc => `
                  <tr>
                    <td>${format(new Date(lanc.data_lancamento), "dd/MM/yyyy", { locale: ptBR })}</td>
                    <td>${lanc.data_vencimento ? format(new Date(lanc.data_vencimento), "dd/MM/yyyy", { locale: ptBR }) : '-'}</td>
                    <td><span style="background: ${
                      lanc.tipo === "Comissão" || lanc.tipo === "Receita" ? "#d1fae5" :
                      lanc.tipo === "Vale" ? "#fef3c7" :
                      lanc.tipo === "Pagamento" ? "#dbeafe" :
                      "#fecaca"
                    }; padding: 4px 8px; border-radius: 4px; font-size: 11px;">${lanc.tipo}</span></td>
                    <td>${lanc.descricao}</td>
                    <td style="color: ${lanc.valor >= 0 ? "#00ff66" : "#ef4444"}; font-weight: bold;">
                      ${lanc.valor >= 0 ? "+" : "-"}${formatarMoeda(Math.abs(lanc.valor))}
                    </td>
                    <td><span style="background: ${
                      lanc.status_pagamento === "Pago"
                        ? "#d1fae5"
                        : servicos.find(s => s.id === lanc.servico_id)?.status_servico === "Cancelado"
                          ? "#e5e7eb" // Light gray for cancelled
                          : "#fef3c7" // Yellow for pending
                    }; padding: 4px 8px; border-radius: 4px; font-size: 11px;">${
                      servicos.find(s => s.id === lanc.servico_id)?.status_servico === "Cancelado" ? "Cancelado" : lanc.status_pagamento
                    }</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="footer">
            <p>© 2025 FR Transportes & Serviços - Sistema de Gestão de Fretes</p>
            <p>Este relatório é confidencial e destinado ao controle interno</p>
            <p style="margin-top: 10px; font-style: italic;">* Os valores exibidos consideram apenas os lançamentos com status "Pago" e serviços não cancelados.</p>
          </div>
        </body>
      </html>
    `;

    const blob = new Blob([conteudo], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `caixa-${resumo.prestador.nome.replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd-HHmm')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Helper functions for new Quitações features
  const abrirQuitacoes = (prestador) => {
    setPrestadorSelecionado(prestador);
    setDialogQuitacoes(true);
  };

  const abrirDetalhesQuitacao = (quitacao) => {
    setQuitacaoSelecionada(quitacao);
    setDialogDetalhesQuitacao(true);
  };

  const handleReverterQuitacao = () => {
    if (!quitacaoSelecionada) return;

    if (window.confirm(`Tem certeza que deseja reverter a quitação do período de ${format(new Date(quitacaoSelecionada.periodo_inicio), "dd/MM/yyyy")} a ${format(new Date(quitacaoSelecionada.periodo_fim), "dd/MM/yyyy")} para ${quitacaoSelecionada.prestador_nome}?\n\nEsta ação irá excluir o lançamento de pagamento automático e marcará esta quitação como revertida no histórico.`)) {
      reverterQuitacao.mutate(quitacaoSelecionada);
    }
  };

  // Filter quitações for the selected prestador, excluding reverted ones
  const quitacoesPrestador = prestadorSelecionado
    ? quitacoes.filter(q => q.prestador_id === prestadorSelecionado.id && !q.revertida)
    : [];

  // Helper function for safe date formatting
  const formatarDataSegura = (dateString) => {
    if (!dateString) return "-";
    try {
      return format(parseISO(dateString), "dd/MM/yyyy", { locale: ptBR });
    } catch (error) {
      return dateString; // Return original if parsing fails
    }
  };

  // Helper function for custom type icons
  const getTipoIcon = (tipo) => {
    switch (tipo) {
      case "Vale":
        return { icon: ShoppingBag, color: "text-yellow-400", bg: "bg-yellow-500/20" };
      case "Despesa":
      case "Débito":
        return { icon: TrendingDown, color: "text-red-400", bg: "bg-red-500/20" };
      case "Comissão":
        return { icon: DollarSign, color: "text-green-400", bg: "bg-green-500/20" };
      case "Receita":
        return { icon: Landmark, color: "text-emerald-400", bg: "bg-emerald-500/20" };
      case "Pagamento":
        return { icon: Wallet, color: "text-blue-400", bg: "bg-blue-500/20" };
      default:
        return { icon: Receipt, color: "text-gray-400", bg: "bg-gray-500/20" };
    }
  };

  // Helper function for custom status badges
  const getStatusBadge = (lancamento) => {
    const servico = servicos.find(s => s.id === lancamento.servico_id);
    
    // ✅ Se o serviço está cancelado, mostrar status especial
    if (servico?.status_servico === "Cancelado") {
      return {
        className: "bg-gray-500/20 text-red-400 border border-gray-500/30",
        text: "Cancelado"
      };
    }
    
    if (lancamento.status_pagamento === "Pago") {
      return {
        className: "bg-green-500/20 text-green-400 border border-green-500/30",
        text: "Pago"
      };
    }
    
    return {
      className: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
      text: "Pendente"
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-4xl font-bold text-white flex items-center gap-3">
            <Wallet className="w-10 h-10 text-green-500" />
            Caixa dos Prestadores
          </h2>
          <p className="text-gray-400 mt-2 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-500" />
            Gestão completa do caixa individual de cada prestador
          </p>
        </div>

        <Button
          onClick={() => abrirNovoLancamento()}
          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-green-500/50"
        >
          <Plus className="w-5 h-5 mr-2" />
          Novo Lançamento
        </Button>
      </div>

      {/* Filtros */}
      <Card className="border-2 border-green-500/20 bg-gray-800/50 backdrop-blur shadow-xl">
        <CardHeader className="border-b border-green-500/20 bg-gray-800/30">
          <CardTitle className="flex items-center gap-2 text-white">
            <Filter className="w-5 h-5 text-green-500" />
            Filtrar por Período
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Atalhos */}
            <div>
              <Label className="text-sm font-semibold mb-3 block text-gray-300">Atalhos de Período</Label>
              <div className="flex gap-3 flex-wrap">
                <Button
                  variant="outline"
                  onClick={() => aplicarAtalho('semana')}
                  className="border-green-500/30 text-green-400 hover:bg-green-500/10 hover:border-green-500/50"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Esta Semana
                </Button>
                <Button
                  variant="outline"
                  onClick={() => aplicarAtalho('quinzena')}
                  className="border-green-500/30 text-green-400 hover:bg-green-500/10 hover:border-green-500/50"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Quinzena Atual
                </Button>
                <Button
                  variant="outline"
                  onClick={() => aplicarAtalho('mes')}
                  className="border-green-500/30 text-green-400 hover:bg-green-500/10 hover:border-green-500/50"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Este Mês
                </Button>
              </div>
            </div>

            {/* Datas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Data Início</Label>
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="bg-gray-700/50 border-green-500/30 text-white focus:border-green-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Data Fim</Label>
                <Input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="bg-gray-700/50 border-green-500/30 text-white focus:border-green-500"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Prestadores */}
      <div className="space-y-4">
        {loadingLancamentos ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
          </div>
        ) : resumoPorPrestador.length === 0 ? (
          <Card className="border-2 border-green-500/20 bg-gray-800/50">
            <CardContent className="py-12 text-center">
              <Wallet className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Nenhum lançamento ou quitação encontrada no período selecionado</p>
            </CardContent>
          </Card>
        ) : (
          resumoPorPrestador.map((resumo) => (
            <Card
              key={resumo.prestador.id}
              className="border-2 border-green-500/20 bg-gradient-to-r from-gray-800/80 to-gray-800/50 backdrop-blur hover:border-green-500/40 transition-all shadow-xl"
            >
              <CardHeader
                className="cursor-pointer hover:bg-gray-700/30 transition-colors"
                onClick={() => setPrestadorExpandido(prestadorExpandido === resumo.prestador.id ? null : resumo.prestador.id)}
              >
                <div className="flex items-center justify-between">
                  {/* Info do Prestador */}
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                      <User className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white">{resumo.prestador.nome}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="border-green-500/30 text-green-400">
                          {resumo.prestador.tipo_servico}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Saldo e Badges */}
                  <div className="flex items-center gap-6">
                    {/* Saldo */}
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Saldo do Período</p>
                      <div className="flex items-center gap-2">
                        {resumo.saldo >= 0 ? (
                          <TrendingUp className="w-5 h-5 text-green-500" />
                        ) : (
                          <TrendingDown className="w-5 h-5 text-red-500" />
                        )}
                        <p className={`text-2xl font-bold ${
                          resumo.saldo >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {formatarMoeda(resumo.saldo)}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">* Apenas valores pagos e serviços não cancelados</p>
                    </div>

                    {/* Lançamentos */}
                    <div className="flex gap-2">
                      {resumo.lancamentosPagos > 0 && (
                        <Badge className="bg-green-500/20 text-green-400 border border-green-500/30">
                          {resumo.lancamentosPagos} pagos
                        </Badge>
                      )}
                      {resumo.lancamentosPendentes > 0 && (
                        <Badge className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                          {resumo.lancamentosPendentes} pendentes
                        </Badge>
                      )}
                    </div>

                    {/* Botões */}
                    <div className="flex gap-2">
                      {/* New Quitações Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          abrirQuitacoes(resumo.prestador);
                        }}
                        className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                      >
                        <History className="w-4 h-4 mr-1" />
                        Quitações
                      </Button>
                      {resumo.saldo > 0 && ( // Only show if saldo is positive
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            quitarPeriodo(resumo);
                          }}
                          className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                        >
                          <DollarSign className="w-4 h-4 mr-1" />
                          Quitar Período
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          abrirNovoLancamento(resumo.prestador);
                        }}
                        className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Lançamento
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          gerarPDFPrestador(resumo);
                        }}
                        className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        PDF
                      </Button>
                    </div>

                    {/* Botão Expandir */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-gray-400 hover:text-green-400 hover:bg-green-500/10"
                    >
                      {prestadorExpandido === resumo.prestador.id ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Conteúdo Expandido */}
              {prestadorExpandido === resumo.prestador.id && (
                <CardContent className="border-t border-green-500/20 bg-gray-900/30">
                  <div className="pt-6 space-y-6">
                    {/* Resumo Financeiro */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="w-4 h-4 text-green-400" />
                          <p className="text-xs text-gray-400">Comissões Pagas</p>
                        </div>
                        <p className="text-2xl font-bold text-green-400">{formatarMoeda(resumo.comissoes)}</p>
                      </div>

                      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="w-4 h-4 text-emerald-400" />
                          <p className="text-xs text-gray-400">Receitas Pagas</p>
                        </div>
                        <p className="text-2xl font-bold text-emerald-400">{formatarMoeda(resumo.receitas)}</p>
                      </div>

                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingDown className="w-4 h-4 text-yellow-400" />
                          <p className="text-xs text-gray-400">Vales Pagos</p>
                        </div>
                        <p className="text-2xl font-bold text-yellow-400">{formatarMoeda(resumo.vales)}</p>
                      </div>

                      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingDown className="w-4 h-4 text-red-400" />
                          <p className="text-xs text-gray-400">Débitos/Despesas Pagos</p>
                        </div>
                        <p className="text-2xl font-bold text-red-400">{formatarMoeda(resumo.debitos)}</p>
                      </div>

                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign className="w-4 h-4 text-blue-400" />
                          <p className="text-xs text-gray-400">Pagamentos</p>
                        </div>
                        <p className="text-2xl font-bold text-blue-400">{formatarMoeda(resumo.pagamentos)}</p>
                      </div>
                    </div>

                    {/* Lista de Lançamentos - Now as a Card with div-based items */}
                    <Card className="border-2 border-green-500/20 bg-gray-800/50">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                          <Receipt className="w-5 h-5 text-green-500" />
                          Lançamentos do Prestador
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {resumo.lancamentos.length === 0 ? (
                            <p className="text-center text-gray-500 py-8">Nenhum lançamento encontrado</p>
                          ) : (
                            // Sort lancamentos for display
                            [...resumo.lancamentos].sort((a, b) => {
                              const dataA = parseISO(a.data_lancamento);
                              const dataB = parseISO(b.data_lancamento);
                              return dataB.getTime() - dataA.getTime(); // Mais recentes primeiro
                            }).map((lancamento) => {
                              const tipoIcon = getTipoIcon(lancamento.tipo);
                              const TipoIconComponent = tipoIcon.icon;
                              const statusBadge = getStatusBadge(lancamento);
                              const servico = servicos.find(s => s.id === lancamento.servico_id);
                              const isCancelado = servico?.status_servico === "Cancelado";

                              return (
                                <div
                                  key={lancamento.id}
                                  className={`p-4 bg-gray-700/30 rounded-lg border ${
                                    isCancelado
                                      ? 'border-gray-500/30 opacity-75'
                                      : 'border-green-500/20 hover:bg-gray-700/50'
                                  } transition-all`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 flex-1">
                                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                        isCancelado ? 'bg-gray-600' : tipoIcon.bg
                                      }`}>
                                        <TipoIconComponent className={`w-5 h-5 ${isCancelado ? 'text-gray-400' : tipoIcon.color}`} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <p className={`font-semibold ${isCancelado ? 'text-gray-500 line-through' : 'text-white'}`}>
                                            {lancamento.descricao}
                                          </p>
                                          <Badge className={statusBadge.className}>
                                            {statusBadge.text}
                                          </Badge>
                                          {lancamento.tipo === "Comissão" && lancamento.servico_id && (
                                            <Link to={createPageUrl("Servicos", lancamento.servico_id)}>
                                              <Badge variant="outline" className="border-green-500/30 text-green-400 hover:bg-green-500/10 cursor-pointer">
                                                OS #{servico?.numero_pedido || lancamento.servico_id.slice(-5)}
                                              </Badge>
                                            </Link>
                                          )}
                                          {isCancelado && (
                                            <Badge className="bg-red-500/20 text-red-400 border border-red-500/30">
                                              ⚠️ Cancelado
                                            </Badge>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                                          <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" /> {/* Using Calendar as CalendarIcon */}
                                            {formatarDataSegura(lancamento.data_lancamento)}
                                          </span>
                                          {lancamento.data_vencimento && (
                                            <span className="flex items-center gap-1">
                                              <Clock className="w-3 h-3" />
                                              Venc: {formatarDataSegura(lancamento.data_vencimento)}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="text-right ml-4">
                                      <p className={`text-xl font-bold ${
                                        isCancelado
                                          ? 'text-gray-500 line-through'
                                          : (lancamento.tipo === "Vale" || lancamento.tipo === "Despesa" || lancamento.tipo === "Débito")
                                            ? 'text-red-400'
                                            : 'text-green-400'
                                      }`}>
                                        {lancamento.valor >= 0 ? '' : '-'}{formatarMoeda(Math.abs(lancamento.valor))}
                                      </p>
                                      {isCancelado && (
                                        <p className="text-xs text-red-400 mt-1">Lançamento cancelado</p>
                                      )}
                                      <div className="flex items-center justify-end gap-2 mt-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => abrirEdicao(lancamento)}
                                          className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                                          title="Editar"
                                        >
                                          <Edit className="w-3 h-3" />
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => darBaixa(lancamento)}
                                          className={
                                            lancamento.status_pagamento === "Pago"
                                              ? "border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
                                              : "border-green-500/30 text-green-400 hover:bg-green-500/10"
                                          }
                                          title={lancamento.status_pagamento === "Pago" ? "Marcar como pendente" : "Marcar como pago"}
                                          disabled={isCancelado} // Disable actions for cancelled items
                                        >
                                          <CheckCircle className="w-3 h-3" />
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleExcluir(lancamento)}
                                          className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                                          title="Excluir lançamento"
                                          disabled={isCancelado} // Disable actions for cancelled items
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>

                                  {lancamento.observacoes && (
                                    <div className="mt-3 p-2 bg-gray-800/50 rounded text-xs text-gray-400">
                                      {lancamento.observacoes}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Dialog Novo Lançamento */}
      <Dialog open={dialogLancamento} onOpenChange={setDialogLancamento}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-800 border-2 border-green-500/30">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-green-500" />
              Novo Lançamento
              {prestadorSelecionado && (
                <span className="text-green-400"> - {prestadorSelecionado.nome}</span>
              )}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label className="text-gray-300">Prestador *</Label>
                <Select
                  value={formData.prestador_id}
                  onValueChange={(value) => setFormData({...formData, prestador_id: value})}
                  disabled={!!prestadorSelecionado}
                >
                  <SelectTrigger className="bg-gray-700 border-green-500/30 text-white">
                    <SelectValue placeholder="Selecione o prestador" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-green-500/30">
                    {prestadores.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Tipo *</Label>
                <Select value={formData.tipo} onValueChange={(value) => setFormData({...formData, tipo: value})}>
                  <SelectTrigger className="bg-gray-700 border-green-500/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-green-500/30">
                    <SelectItem value="Vale">Vale</SelectItem>
                    <SelectItem value="Despesa">Despesa</SelectItem>
                    <SelectItem value="Débito">Débito</SelectItem>
                    <SelectItem value="Pagamento">Pagamento</SelectItem>
                    <SelectItem value="Comissão">Comissão</SelectItem>
                    <SelectItem value="Receita">Receita</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Valor (R$) *</Label>
                <Input
                  type="text" // Changed to text to allow custom formatting
                  required
                  value={formData.valor}
                  onChange={(e) => {
                    const valor = e.target.value.replace(/[^0-9,]/g, ''); // Allow only digits and comma
                    setFormData({...formData, valor: valor});
                  }}
                  onBlur={(e) => {
                    const num = parseFloat(e.target.value.replace(',', '.')); // Convert comma to dot for parsing
                    if (!isNaN(num)) {
                      setFormData({...formData, valor: num.toFixed(2).replace('.', ',')}); // Format to X,XX
                    } else {
                      setFormData({...formData, valor: ""}); // Clear if invalid
                    }
                  }}
                  placeholder="0,00"
                  className="bg-gray-700 border-green-500/30 text-white"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-gray-300">Descrição *</Label>
                <Input
                  required
                  value={formData.descricao}
                  onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                  className="bg-gray-700 border-green-500/30 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Data do Lançamento *</Label>
                <Input
                  type="date"
                  required
                  value={formData.data_lancamento}
                  onChange={(e) => setFormData({...formData, data_lancamento: e.target.value})}
                  className="bg-gray-700 border-green-500/30 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Data de Vencimento</Label>
                <Input
                  type="date"
                  value={formData.data_vencimento}
                  onChange={(e) => setFormData({...formData, data_vencimento: e.target.value})}
                  className="bg-gray-700 border-green-500/30 text-white"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-gray-300">Status *</Label>
                <Select value={formData.status_pagamento} onValueChange={(value) => setFormData({...formData, status_pagamento: value})}>
                  <SelectTrigger className="bg-gray-700 border-green-500/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-green-500/30">
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Pago">Pago</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Novo Checkbox para incluir no financeiro geral */}
              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center space-x-2 p-3 bg-gray-700/30 rounded-lg border border-gray-600">
                  <Checkbox
                    id="incluir-financeiro"
                    checked={formData.incluir_financeiro_geral}
                    onCheckedChange={(checked) => setFormData({...formData, incluir_financeiro_geral: checked})}
                  />
                  <div className="flex-1">
                    <label htmlFor="incluir-financeiro" className="text-sm font-medium text-gray-300 cursor-pointer">
                      Incluir no Financeiro Geral da Empresa
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Se desmarcado, este lançamento afetará apenas o caixa do prestador, sem impactar o financeiro principal.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="recorrente"
                    checked={formData.recorrente}
                    onCheckedChange={(checked) => setFormData({...formData, recorrente: checked})}
                  />
                  <label htmlFor="recorrente" className="text-sm font-medium text-gray-300">
                    Lançamento Recorrente
                  </label>
                </div>
              </div>
            </div>

            {formData.recorrente && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-700/30 rounded-lg border border-gray-600">
                <div className="space-y-2">
                  <Label className="text-gray-300">Periodicidade</Label>
                  <Select value={formData.periodicidade} onValueChange={(value) => setFormData({...formData, periodicidade: value})}>
                    <SelectTrigger className="bg-gray-700 border-green-500/30 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-green-500/30">
                      <SelectItem value="Semanal">Semanal</SelectItem>
                      <SelectItem value="Quinzenal">Quinzenal</SelectItem>
                      <SelectItem value="Mensal">Mensal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Número de Parcelas</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.parcelas}
                    onChange={(e) => setFormData({...formData, parcelas: parseInt(e.target.value)})}
                    className="bg-gray-700 border-green-500/30 text-white"
                  />
                  <p className="text-xs text-gray-500">0 = Infinito</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-gray-300">Observações</Label>
              <Textarea
                value={formData.observacoes}
                onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                rows={3}
                className="bg-gray-700 border-green-500/30 text-white"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogLancamento(false)} className="border-gray-600 text-gray-300 hover:bg-gray-700">
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                disabled={createMutation.isPending}
              >
                Criar Lançamento
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Edição */}
      <Dialog open={dialogEdicao} onOpenChange={setDialogEdicao}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-800 border-2 border-green-500/30">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Edit className="w-5 h-5 text-blue-500" />
              Editar Lançamento
            </DialogTitle>
          </DialogHeader>

          {lancamentoSelecionado && (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">Tipo *</Label>
                  <Select
                    value={lancamentoSelecionado.tipo}
                    onValueChange={(value) => setLancamentoSelecionado({...lancamentoSelecionado, tipo: value})}
                  >
                    <SelectTrigger className="bg-gray-700 border-green-500/30 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-green-500/30">
                      <SelectItem value="Vale">Vale</SelectItem>
                      <SelectItem value="Despesa">Despesa</SelectItem>
                      <SelectItem value="Débito">Débito</SelectItem>
                      <SelectItem value="Pagamento">Pagamento</SelectItem>
                      <SelectItem value="Comissão">Comissão</SelectItem>
                      <SelectItem value="Receita">Receita</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Valor (R$) *</Label>
                  <Input
                    type="text" // Changed to text
                    required
                    value={lancamentoSelecionado.valor} // This now holds a formatted string
                    onChange={(e) => {
                      const valor = e.target.value.replace(/[^0-9,]/g, '');
                      setLancamentoSelecionado({...lancamentoSelecionado, valor: valor});
                    }}
                    onBlur={(e) => {
                      const num = parseFloat(e.target.value.replace(',', '.'));
                      if (!isNaN(num)) {
                        setLancamentoSelecionado({...lancamentoSelecionado, valor: num.toFixed(2).replace('.', ',')});
                      } else {
                        // Keep current value or set to empty string if invalid
                        setLancamentoSelecionado({...lancamentoSelecionado, valor: ""});
                      }
                    }}
                    className="bg-gray-700 border-green-500/30 text-white"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-gray-300">Descrição *</Label>
                  <Input
                    required
                    value={lancamentoSelecionado.descricao}
                    onChange={(e) => setLancamentoSelecionado({...lancamentoSelecionado, descricao: e.target.value})}
                    className="bg-gray-700 border-green-500/30 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Data do Lançamento *</Label>
                  <Input
                    type="date"
                    required
                    value={lancamentoSelecionado.data_lancamento}
                    onChange={(e) => setLancamentoSelecionado({...lancamentoSelecionado, data_lancamento: e.target.value})}
                    className="bg-gray-700 border-green-500/30 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Data de Vencimento</Label>
                  <Input
                    type="date"
                    value={lancamentoSelecionado.data_vencimento || ""} // Ensure empty string for null
                    onChange={(e) => setLancamentoSelecionado({...lancamentoSelecionado, data_vencimento: e.target.value})}
                    className="bg-gray-700 border-green-500/30 text-white"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-gray-300">Status *</Label>
                  <Select
                    value={lancamentoSelecionado.status_pagamento}
                    onValueChange={(value) => setLancamentoSelecionado({...lancamentoSelecionado, status_pagamento: value})}
                  >
                    <SelectTrigger className="bg-gray-700 border-green-500/30 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-green-500/30">
                      <SelectItem value="Pendente">Pendente</SelectItem>
                      <SelectItem value="Pago">Pago</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Novo Checkbox para incluir no financeiro geral na edição */}
                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center space-x-2 p-3 bg-gray-700/30 rounded-lg border border-gray-600">
                    <Checkbox
                      id="edit-incluir-financeiro"
                      checked={lancamentoSelecionado.incluir_financeiro_geral || false} // Default to false if undefined
                      onCheckedChange={(checked) => setLancamentoSelecionado({...lancamentoSelecionado, incluir_financeiro_geral: checked})}
                    />
                    <div className="flex-1">
                      <label htmlFor="edit-incluir-financeiro" className="text-sm font-medium text-gray-300 cursor-pointer">
                        Incluir no Financeiro Geral da Empresa
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        Se desmarcado, este lançamento afetará apenas o caixa do prestador, sem impactar o financeiro principal.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Observações</Label>
                <Textarea
                  value={lancamentoSelecionado.observacoes || ""}
                  onChange={(e) => setLancamentoSelecionado({...lancamentoSelecionado, observacoes: e.target.value})}
                  rows={3}
                  className="bg-gray-700 border-green-500/30 text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogEdicao(false)} className="border-gray-600 text-gray-300 hover:bg-gray-700">
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                  disabled={updateMutation.isPending}
                >
                  Salvar Alterações
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Quitações */}
      <Dialog open={dialogQuitacoes} onOpenChange={setDialogQuitacoes}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-gray-800 border-2 border-purple-500/30">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <History className="w-5 h-5 text-purple-500" />
              Histórico de Quitações
              {prestadorSelecionado && (
                <span className="text-purple-400"> - {prestadorSelecionado.nome}</span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {quitacoesPrestador.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">Nenhuma quitação encontrada para este prestador</p>
              </div>
            ) : (
              quitacoesPrestador.map((quitacao) => (
                <Card key={quitacao.id} className="border-2 border-purple-500/20 bg-gray-700/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                            Quitado em: {format(new Date(quitacao.data_quitacao), "dd/MM/yyyy", { locale: ptBR })}
                          </Badge>
                          <p className="text-white font-semibold">
                            Período: {format(new Date(quitacao.periodo_inicio), "dd/MM/yyyy")} a {format(new Date(quitacao.periodo_fim), "dd/MM/yyyy")}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="text-sm text-gray-400 mb-1">Valor Quitado</p>
                            <p className="text-2xl font-bold text-purple-400">
                              {formatarMoeda(quitacao.saldo_quitado)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-400 mb-1">Lançamentos Envolvidos</p>
                            <p className="text-lg font-semibold text-gray-300">
                              {quitacao.lancamentos_ids?.length || 0} itens
                            </p>
                          </div>
                        </div>
                        {quitacao.observacoes && (
                          <p className="text-sm text-gray-500 mt-2">Obs: {quitacao.observacoes}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => abrirDetalhesQuitacao(quitacao)}
                          className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Detalhes
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Detalhes da Quitação */}
      <Dialog open={dialogDetalhesQuitacao} onOpenChange={setDialogDetalhesQuitacao}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-gray-800 border-2 border-purple-500/30">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-500" />
              Detalhes da Quitação
            </DialogTitle>
          </DialogHeader>

          {quitacaoSelecionada && (
            <div className="space-y-6">
              {/* Informações Gerais */}
              <Card className="border-2 border-purple-500/20 bg-gray-700/50">
                <CardHeader className="border-b border-purple-500/20">
                  <CardTitle className="text-white">Informações da Quitação</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Prestador</p>
                      <p className="text-lg font-semibold text-white">{quitacaoSelecionada.prestador_nome}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Data da Quitação</p>
                      <p className="text-lg font-semibold text-white">
                        {format(new Date(quitacaoSelecionada.data_quitacao), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Período Quitado</p>
                      <p className="text-lg font-semibold text-white">
                        {format(new Date(quitacaoSelecionada.periodo_inicio), "dd/MM/yyyy")} a {format(new Date(quitacaoSelecionada.periodo_fim), "dd/MM/yyyy")}
                      </p>
                    </div>
                    <div className="md:col-span-1">
                      <p className="text-sm text-gray-400 mb-1">Valor Quitado</p>
                      <p className="text-2xl font-bold text-purple-400">
                        {formatarMoeda(quitacaoSelecionada.saldo_quitado)}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-400 mb-1">Lançamento de Pagamento (ID)</p>
                      <p className="text-lg font-semibold text-white">{quitacaoSelecionada.lancamento_pagamento_id || "N/A"}</p>
                    </div>
                  </div>
                  {quitacaoSelecionada.observacoes && (
                    <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
                      <p className="text-sm text-gray-400 mb-1">Observações</p>
                      <p className="text-gray-300">{quitacaoSelecionada.observacoes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Lançamentos Incluídos */}
              <Card className="border-2 border-purple-500/20 bg-gray-700/50">
                <CardHeader className="border-b border-purple-500/20">
                  <CardTitle className="text-white">Lançamentos Incluídos na Quitação</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-900/50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-purple-400 uppercase">Data</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-purple-400 uppercase">Tipo</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-purple-400 uppercase">Descrição</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-purple-400 uppercase">Valor</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-purple-400 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700/50">
                        {lancamentos
                          .filter(l => quitacaoSelecionada.lancamentos_ids?.includes(l.id))
                          .map((lanc) => (
                            <tr key={lanc.id} className="hover:bg-purple-500/5">
                              <td className="px-4 py-3 text-sm text-gray-300">
                                {format(new Date(lanc.data_lancamento), "dd/MM/yyyy", { locale: ptBR })}
                              </td>
                              <td className="px-4 py-3">
                                <Badge className={
                                  lanc.tipo === "Comissão" || lanc.tipo === "Receita" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                                  lanc.tipo === "Vale" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                                  lanc.tipo === "Pagamento" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                                  "bg-red-500/20 text-red-400 border-red-500/30"
                                }>
                                  {lanc.tipo}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-300">{lanc.descricao}</td>
                              <td className={`px-4 py-3 text-right text-sm font-semibold ${
                                lanc.valor >= 0 ? "text-green-400" : "text-red-400"
                              }`}>
                                {lanc.valor >= 0 ? "+" : "-"}{formatarMoeda(Math.abs(lanc.valor))}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <Badge className={
                                  lanc.status_pagamento === "Pago"
                                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                                    : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                }>
                                  {lanc.status_pagamento}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Ações */}
              <div className="flex justify-between items-center pt-4 border-t border-purple-500/20">
                <Button
                  variant="outline"
                  onClick={() => setDialogDetalhesQuitacao(false)}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Fechar
                </Button>
                <Button
                  onClick={handleReverterQuitacao}
                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
                  disabled={reverterQuitacao.isPending}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reverter Quitação
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
