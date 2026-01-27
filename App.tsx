
import React, { useState, useEffect, useCallback } from 'react';
import { User, UserRole, AppState, NotaFiscal, OrdemProducao, Comentario } from './types';
import { db, supabase } from './services/supabase';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { ListManager } from './components/ListManager';
import { AdminPanel } from './components/AdminPanel';
import { Auth } from './components/Auth';
import { analyzeDailyLogs } from './services/gemini';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [currentSection, setCurrentSection] = useState<'dashboard' | 'notas' | 'ordens' | 'comentarios' | 'admin'>('dashboard');
  const [data, setData] = useState<AppState>({ notas: [], ordens: [], comentarios: [] });
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<string>('');

  const refreshData = useCallback(async () => {
    try {
      const [notas, ordens, comentarios] = await Promise.all([
        db.notas.fetch(),
        db.ordens.fetch(),
        db.comentarios.fetch()
      ]);
      setData({ notas, ordens, comentarios });
    } catch (error) {
      console.error("Failed to refresh data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
    const channel = supabase.channel('nano-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        refreshData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshData]);

  const handleSmartAnalysis = async () => {
    setAnalysis("Analisando registros operacionais Nano e identificando tendências...");
    const result = await analyzeDailyLogs(data);
    setAnalysis(result || "Falha na análise Nano.");
  };

  const handleLogin = (u: User) => {
    setUser(u);
    sessionStorage.setItem('active_user', JSON.stringify(u));
  };

  const logout = () => {
    setUser(null);
    setIsGuest(false);
    setCurrentSection('dashboard');
    sessionStorage.removeItem('active_user');
  };

  const handleNavigate = (section: 'notas' | 'ordens' | 'comentarios') => {
    setCurrentSection(section);
  };

  if (!user && !isGuest) {
    return <Auth onLogin={handleLogin} onGuest={() => setIsGuest(true)} />;
  }

  const role: UserRole = isGuest ? 'guest' : user?.role || 'operador';

  return (
    <Layout 
      currentSection={currentSection} 
      onSectionChange={setCurrentSection} 
      user={user} 
      isGuest={isGuest}
      onLogout={logout}
      data={data}
    >
      {currentSection === 'dashboard' && (
        <Dashboard 
          data={data} 
          analysis={analysis} 
          onRunAnalysis={handleSmartAnalysis}
          onRefresh={refreshData}
          isGuest={isGuest}
          onNavigateToList={handleNavigate}
        />
      )}
      {currentSection === 'notas' && (
        <ListManager<NotaFiscal>
          title="Nota Fiscal"
          items={data.notas}
          role={role}
          type="nota"
          onSave={db.notas.save}
          onDelete={db.notas.delete}
          onRefresh={refreshData}
        />
      )}
      {currentSection === 'ordens' && (
        <ListManager<OrdemProducao>
          title="Ordem"
          items={data.ordens}
          role={role}
          type="ordem"
          onSave={db.ordens.save}
          onDelete={db.ordens.delete}
          onRefresh={refreshData}
        />
      )}
      {currentSection === 'comentarios' && !isGuest && (
        <ListManager<Comentario>
          title="Apontamentos"
          items={data.comentarios}
          role={role}
          type="comentario"
          onSave={db.comentarios.save}
          onDelete={db.comentarios.delete}
          onRefresh={refreshData}
        />
      )}
      {currentSection === 'admin' && !isGuest && (
        <AdminPanel currentData={data} onRefresh={refreshData} />
      )}
    </Layout>
  );
};

export default App;
