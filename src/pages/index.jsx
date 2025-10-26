import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard";

import Clientes from "./Clientes";

import Prestadores from "./Prestadores";

import Servicos from "./Servicos";

import Agendamentos from "./Agendamentos";

import Financeiro from "./Financeiro";

import Relatorios from "./Relatorios";

import Usuarios from "./Usuarios";

import CaixaPrestadores from "./CaixaPrestadores";

import MeusFretes from "./MeusFretes";

import RelatorioDia from "./RelatorioDia";

import ServicosConcluidos from "./ServicosConcluidos";

import RelatoriosPrestador from "./RelatoriosPrestador";

import Faturado from "./Faturado";

import Fechamentos from "./Fechamentos";

import ConfigurarPWA from "./ConfigurarPWA";

import DiagnosticoSistema from "./DiagnosticoSistema";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Dashboard: Dashboard,
    
    Clientes: Clientes,
    
    Prestadores: Prestadores,
    
    Servicos: Servicos,
    
    Agendamentos: Agendamentos,
    
    Financeiro: Financeiro,
    
    Relatorios: Relatorios,
    
    Usuarios: Usuarios,
    
    CaixaPrestadores: CaixaPrestadores,
    
    MeusFretes: MeusFretes,
    
    RelatorioDia: RelatorioDia,
    
    ServicosConcluidos: ServicosConcluidos,
    
    RelatoriosPrestador: RelatoriosPrestador,
    
    Faturado: Faturado,
    
    Fechamentos: Fechamentos,
    
    ConfigurarPWA: ConfigurarPWA,
    
    DiagnosticoSistema: DiagnosticoSistema,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Dashboard />} />
                
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/Clientes" element={<Clientes />} />
                
                <Route path="/Prestadores" element={<Prestadores />} />
                
                <Route path="/Servicos" element={<Servicos />} />
                
                <Route path="/Agendamentos" element={<Agendamentos />} />
                
                <Route path="/Financeiro" element={<Financeiro />} />
                
                <Route path="/Relatorios" element={<Relatorios />} />
                
                <Route path="/Usuarios" element={<Usuarios />} />
                
                <Route path="/CaixaPrestadores" element={<CaixaPrestadores />} />
                
                <Route path="/MeusFretes" element={<MeusFretes />} />
                
                <Route path="/RelatorioDia" element={<RelatorioDia />} />
                
                <Route path="/ServicosConcluidos" element={<ServicosConcluidos />} />
                
                <Route path="/RelatoriosPrestador" element={<RelatoriosPrestador />} />
                
                <Route path="/Faturado" element={<Faturado />} />
                
                <Route path="/Fechamentos" element={<Fechamentos />} />
                
                <Route path="/ConfigurarPWA" element={<ConfigurarPWA />} />
                
                <Route path="/DiagnosticoSistema" element={<DiagnosticoSistema />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}