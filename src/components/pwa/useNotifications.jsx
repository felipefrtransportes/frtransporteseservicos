import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export function useNotifications(user) {
  const { data: servicos = [] } = useQuery({
    queryKey: ['servicos-notifications'],
    queryFn: () => base44.entities.Servico.list('-created_date', 5),
    refetchInterval: 5000,
    enabled: !!user
  });

  const { data: lancamentos = [] } = useQuery({
    queryKey: ['lancamentos-notifications'],
    queryFn: () => base44.entities.Lancamento.list('-data_lancamento', 5),
    refetchInterval: 30000,
    enabled: !!user && user.tipos_usuario?.includes("Administrador")
  });

  // Detectar novos serviços
  useEffect(() => {
    if (!servicos.length || !user) return;

    const ultimoServico = servicos[0];
    const agora = new Date();
    const dataCriacao = new Date(ultimoServico.created_date);
    const diferencaSegundos = (agora - dataCriacao) / 1000;

    // Se o serviço foi criado nos últimos 10 segundos
    if (diferencaSegundos < 10) {
      // Notificar prestador se for o destinatário
      if (user.tipos_usuario?.includes("Prestador") && ultimoServico.prestador_id === user.prestador_id) {
        const isUrgente = ultimoServico.urgente;
        
        if (window.frNotifications) {
          window.frNotifications.show('Novo Serviço! 🚚', {
            body: `OS #${ultimoServico.numero_pedido} - ${ultimoServico.urgente ? '🚨 URGENTE!' : 'Aguardando aceitação'}`,
            tag: 'novo-servico',
            requireInteraction: isUrgente,
            data: { url: '/MeusFretes' },
            vibrate: isUrgente ? [300, 100, 300, 100, 300] : [200, 100, 200]
          });

          window.frNotifications.playSound(isUrgente ? 'alerta.mp3' : 'notificacao1.mp3');
        }
      }

      // Notificar administrador
      if (user.tipos_usuario?.includes("Administrador")) {
        if (window.frNotifications) {
          window.frNotifications.show('Novo Serviço Criado', {
            body: `OS #${ultimoServico.numero_pedido} - ${ultimoServico.prestador_nome}`,
            tag: 'servico-criado',
            data: { url: '/Servicos' }
          });
        }
      }
    }
  }, [servicos, user]);

  // Detectar serviços concluídos
  useEffect(() => {
    if (!servicos.length || !user || !user.tipos_usuario?.includes("Administrador")) return;

    servicos.forEach((servico) => {
      if (servico.status_servico === "Concluído" && servico.data_conclusao) {
        const agora = new Date();
        const dataConclusao = new Date(servico.data_conclusao);
        const diferencaSegundos = (agora - dataConclusao) / 1000;

        if (diferencaSegundos < 10) {
          if (window.frNotifications) {
            window.frNotifications.show('Serviço Concluído ✅', {
              body: `OS #${servico.numero_pedido} - ${servico.prestador_nome}`,
              tag: 'servico-concluido',
              data: { url: '/Servicos' }
            });

            window.frNotifications.playSound('notificacao2.mp3');
          }
        }
      }
    });
  }, [servicos, user]);

  // Detectar contas a vencer
  useEffect(() => {
    if (!lancamentos.length || !user || !user.tipos_usuario?.includes("Administrador")) return;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    lancamentos.forEach((lancamento) => {
      if (lancamento.status_pagamento === "Pendente" && lancamento.data_vencimento) {
        const dataVenc = new Date(lancamento.data_vencimento);
        dataVenc.setHours(0, 0, 0, 0);

        // Se vence hoje
        if (dataVenc.getTime() === hoje.getTime()) {
          if (window.frNotifications) {
            window.frNotifications.show('Conta Vencendo Hoje! ⏰', {
              body: `${lancamento.descricao} - ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lancamento.valor)}`,
              tag: 'conta-vencendo',
              requireInteraction: true,
              data: { url: '/Financeiro' }
            });

            window.frNotifications.playSound('notificacao4.mp3');
          }
        }
      }
    });
  }, [lancamentos, user]);

  return null;
}