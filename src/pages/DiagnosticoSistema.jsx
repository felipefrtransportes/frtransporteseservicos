import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertCircle, Loader2, RefreshCw, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function DiagnosticoSistema() {
  const [testes, setTestes] = useState({
    autenticacao: { status: 'pendente', mensagem: '', detalhes: '' },
    servicos: { status: 'pendente', mensagem: '', detalhes: '' },
    clientes: { status: 'pendente', mensagem: '', detalhes: '' },
    prestadores: { status: 'pendente', mensagem: '', detalhes: '' },
    usuarios: { status: 'pendente', mensagem: '', detalhes: '' },
    lancamentos: { status: 'pendente', mensagem: '', detalhes: '' },
    recusas: { status: 'pendente', mensagem: '', detalhes: '' },
    cors: { status: 'pendente', mensagem: '', detalhes: '' }
  });
  
  const [testando, setTestando] = useState(false);
  const [logCompleto, setLogCompleto] = useState([]);

  const addLog = (mensagem, tipo = 'info') => {
    const timestamp = new Date().toISOString();
    const log = `[${timestamp}] [${tipo.toUpperCase()}] ${mensagem}`;
    setLogCompleto(prev => [...prev, log]);
    console.log(log);
  };

  const atualizarTeste = (entidade, status, mensagem, detalhes = '') => {
    setTestes(prev => ({
      ...prev,
      [entidade]: { status, mensagem, detalhes }
    }));
  };

  const testarConexao = async (entidade, funcao, nome) => {
    addLog(`🔄 Testando ${nome}...`);
    try {
      const inicio = Date.now();
      const resultado = await funcao();
      const tempo = Date.now() - inicio;
      
      const quantidade = Array.isArray(resultado) ? resultado.length : 'N/A';
      const mensagem = `✅ ${quantidade} registros em ${tempo}ms`;
      
      atualizarTeste(entidade, 'sucesso', mensagem, JSON.stringify(resultado?.slice(0, 2), null, 2));
      addLog(`✅ ${nome}: ${mensagem}`, 'success');
      return true;
    } catch (error) {
      const mensagemErro = error.message || 'Erro desconhecido';
      const status = error.response?.status || 'N/A';
      const detalhes = `Status: ${status}\nErro: ${mensagemErro}\nStack: ${error.stack?.slice(0, 200)}`;
      
      let tipoErro = 'erro';
      if (mensagemErro.includes('CORS') || mensagemErro.includes('blocked')) {
        tipoErro = 'cors';
      } else if (status === 403) {
        tipoErro = 'permissao';
      } else if (status === 500) {
        tipoErro = 'servidor';
      }
      
      atualizarTeste(entidade, tipoErro, `❌ ${mensagemErro}`, detalhes);
      addLog(`❌ ${nome}: ${mensagemErro}`, 'error');
      return false;
    }
  };

  const executarTodosTestes = async () => {
    setTestando(true);
    setLogCompleto([]);
    addLog('🚀 Iniciando diagnóstico completo do sistema...');
    addLog(`📍 URL: ${window.location.origin}`);
    addLog(`🌐 User-Agent: ${navigator.userAgent}`);
    
    // Teste 1: Autenticação
    await testarConexao('autenticacao', () => base44.auth.me(), 'Autenticação de Usuário');
    
    // Teste 2: Entidades principais
    await testarConexao('servicos', () => base44.entities.Servico.list(), 'Entidade Servicos');
    await testarConexao('clientes', () => base44.entities.Cliente.list(), 'Entidade Clientes');
    await testarConexao('prestadores', () => base44.entities.Prestador.list(), 'Entidade Prestadores');
    await testarConexao('usuarios', () => base44.entities.User.list(), 'Entidade Users');
    await testarConexao('lancamentos', () => base44.entities.Lancamento.list(), 'Entidade Lancamentos');
    await testarConexao('recusas', () => base44.entities.RecusaServico.list(), 'Entidade RecusaServico');
    
    // Teste de CORS específico
    addLog('🔍 Testando headers CORS...');
    try {
      const response = await fetch(window.location.origin, { 
        method: 'OPTIONS',
        headers: { 'Origin': window.location.origin }
      });
      
      const corsHeaders = {
        'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
        'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
        'access-control-allow-credentials': response.headers.get('access-control-allow-credentials')
      };
      
      const corsOk = corsHeaders['access-control-allow-origin'] !== null;
      
      if (corsOk) {
        atualizarTeste('cors', 'sucesso', '✅ Headers CORS configurados', JSON.stringify(corsHeaders, null, 2));
        addLog('✅ CORS: Headers presentes', 'success');
      } else {
        atualizarTeste('cors', 'cors', '❌ Headers CORS ausentes', JSON.stringify(corsHeaders, null, 2));
        addLog('❌ CORS: Headers não encontrados', 'error');
      }
    } catch (error) {
      atualizarTeste('cors', 'erro', '❌ Falha no teste CORS', error.message);
      addLog(`❌ CORS Test: ${error.message}`, 'error');
    }
    
    addLog('🏁 Diagnóstico completo finalizado!');
    setTestando(false);
  };

  useEffect(() => {
    executarTodosTestes();
  }, []);

  const copiarLog = () => {
    navigator.clipboard.writeText(logCompleto.join('\n'));
    alert('📋 Log copiado para a área de transferência!');
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sucesso':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'erro':
      case 'cors':
      case 'permissao':
      case 'servidor':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pendente':
        return <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'sucesso':
        return 'border-green-500/30 bg-green-500/10';
      case 'cors':
        return 'border-orange-500/30 bg-orange-500/10';
      case 'permissao':
        return 'border-yellow-500/30 bg-yellow-500/10';
      case 'erro':
      case 'servidor':
        return 'border-red-500/30 bg-red-500/10';
      default:
        return 'border-gray-500/30 bg-gray-500/10';
    }
  };

  const resumo = Object.values(testes).reduce((acc, teste) => {
    acc[teste.status] = (acc[teste.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              🔍 Diagnóstico do Sistema
            </h1>
            <p className="text-gray-400 mt-2">
              Validação de conexões e entidades - FR Transportes
            </p>
          </div>
          <Button
            onClick={executarTodosTestes}
            disabled={testando}
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
          >
            {testando ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testando...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Executar Novamente
              </>
            )}
          </Button>
        </div>

        {/* Resumo */}
        <Card className="border-2 border-green-500/20 bg-gray-800/50">
          <CardHeader>
            <CardTitle className="text-white">Resumo Geral</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-500">{resumo.sucesso || 0}</p>
                <p className="text-sm text-gray-400">Sucessos</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-red-500">{(resumo.erro || 0) + (resumo.servidor || 0)}</p>
                <p className="text-sm text-gray-400">Erros</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-orange-500">{resumo.cors || 0}</p>
                <p className="text-sm text-gray-400">CORS</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-yellow-500">{resumo.permissao || 0}</p>
                <p className="text-sm text-gray-400">Permissões</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Testes Individuais */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(testes).map(([key, teste]) => (
            <Card key={key} className={`border-2 ${getStatusColor(teste.status)}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {getStatusIcon(teste.status)}
                  <div className="flex-1">
                    <h3 className="font-semibold text-white capitalize mb-1">
                      {key.replace(/_/g, ' ')}
                    </h3>
                    <p className="text-sm text-gray-300 mb-2">{teste.mensagem}</p>
                    {teste.detalhes && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-gray-500 hover:text-gray-400">
                          Ver detalhes
                        </summary>
                        <pre className="mt-2 p-2 bg-gray-900 rounded text-gray-400 overflow-x-auto">
                          {teste.detalhes}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Log Completo */}
        <Card className="border-2 border-green-500/20 bg-gray-800/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">Log Completo</CardTitle>
            <Button
              onClick={copiarLog}
              variant="outline"
              size="sm"
              className="border-green-500/30 text-green-400"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copiar Log
            </Button>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-900 p-4 rounded-lg text-xs text-gray-400 max-h-96 overflow-auto font-mono">
              {logCompleto.join('\n') || 'Aguardando início do diagnóstico...'}
            </pre>
          </CardContent>
        </Card>

        {/* Instruções para Correção */}
        {(resumo.cors > 0 || resumo.erro > 0) && (
          <Card className="border-2 border-yellow-500/30 bg-yellow-500/10">
            <CardHeader>
              <CardTitle className="text-yellow-400 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Ações Necessárias
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-gray-300 text-sm">
              {resumo.cors > 0 && (
                <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded">
                  <p className="font-semibold text-orange-400 mb-2">🚫 Erro de CORS Detectado</p>
                  <p className="mb-2">A equipe da Base44 precisa adicionar os seguintes headers HTTP:</p>
                  <pre className="bg-gray-900 p-2 rounded text-xs">
{`Access-Control-Allow-Origin: https://frtransportes.base44.app
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true`}
                  </pre>
                </div>
              )}
              
              {resumo.permissao > 0 && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded">
                  <p className="font-semibold text-yellow-400 mb-2">🔒 Erro de Permissão (403)</p>
                  <p>Verifique as permissões do usuário no painel de administração da Base44.</p>
                </div>
              )}
              
              {resumo.servidor > 0 && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded">
                  <p className="font-semibold text-red-400 mb-2">⚠️ Erro no Servidor (500)</p>
                  <p>Problema interno no servidor Base44. Entre em contato com o suporte.</p>
                </div>
              )}

              <div className="pt-3 border-t border-gray-700">
                <p className="font-semibold text-green-400 mb-2">✅ Próximos Passos:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Execute "Resync Data Connections" nas entidades</li>
                  <li>Ative "Realtime Sync" em todas as entidades</li>
                  <li>Faça rebuild de cache (Build → Publish → Clear CDN)</li>
                  <li>Execute este diagnóstico novamente</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}