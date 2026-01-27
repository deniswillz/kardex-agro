
import React, { useState } from 'react';
import { User } from '../types';
import { supabase } from '../services/supabase';

interface AuthProps {
  onLogin: (user: User) => void;
  onGuest: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin, onGuest }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const safeUsername = username.toLowerCase().trim();
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('username', safeUsername)
        .maybeSingle();

      if (userError || !user) throw new Error('Credenciais não reconhecidas.');
      if (user.password !== password) throw new Error('Senha incorreta.');

      onLogin(user);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#006B47] flex flex-col items-center justify-between p-6 sm:p-8">

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-6">
          {/* Logo PNG */}
          <div className="inline-flex items-center justify-center mb-6">
            <img
              src="/logo.png"
              alt="Nano Pro"
              className="h-32 w-auto"
            />
          </div>

          {/* Slogan */}
          <p className="text-white/80 text-[10px] sm:text-xs font-semibold tracking-[0.3em] uppercase">
            Logística Industrial Inteligente
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-xs font-semibold text-center border border-red-100">
              {error}
            </div>
          )}

          {/* Login Field */}
          <div>
            <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              Login
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-slate-100 border-0 rounded-lg p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#006B47]"
              placeholder="Seu login"
              required
            />
          </div>

          {/* Password Field */}
          <div>
            <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-slate-100 border-0 rounded-lg p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#006B47]"
              placeholder="••••••••"
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#006B47] text-white py-4 rounded-lg font-black text-sm uppercase tracking-widest hover:bg-[#005538] transition-all active:scale-[0.98] disabled:opacity-70"
          >
            {loading ? 'Sincronizando...' : 'Entrar'}
          </button>

          {/* Guest Mode */}
          <p className="text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest pt-2">
            <button
              type="button"
              onClick={onGuest}
              className="hover:text-[#006B47] transition-all"
            >
              Modo Consulta (Visitante)
            </button>
          </p>
        </form>
      </div>

      {/* Footer */}
      <div className="w-full text-center pt-8">
        <p className="text-white/60 text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.2em]">
          Nano Pro © 2026 - Gestão Industrial de Alta Performance
        </p>
      </div>
    </div>
  );
};
