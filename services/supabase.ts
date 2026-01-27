
import { createClient } from '@supabase/supabase-js';
import { NotaFiscal, Comentario, User, Backup, AppState } from '../types';

const SUPABASE_URL = 'https://sibdtuatfpdjqgrhekoe.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpYmR0dWF0ZnBkanFncmhla29lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMDkxOTIsImV4cCI6MjA4Mzg4NTE5Mn0.jRDGgIhiekr6cGgHg0nb6jNkHamFKTCunOjaii_9Yew';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const formatSupabaseError = (error: any): string => {
  if (!error) return 'Erro desconhecido';
  if (typeof error === 'string') return error;
  return error.message || error.details || 'Erro ao processar detalhes da falha';
};

export const db = {
  notas: {
    async fetch() {
      const { data, error } = await supabase.from('notas_fiscais').select('*').order('data', { ascending: false });
      if (error) throw new Error(formatSupabaseError(error));
      return data as NotaFiscal[];
    },
    async save(nota: Partial<NotaFiscal>) {
      const { data, error } = await supabase.from('notas_fiscais').upsert(nota).select().single();
      if (error) throw new Error(formatSupabaseError(error));
      return data;
    },
    async delete(id: string) {
      const { error } = await supabase.from('notas_fiscais').delete().eq('id', id);
      if (error) throw new Error(formatSupabaseError(error));
    }
  },
  comentarios: {
    async fetch() {
      const { data, error } = await supabase.from('comentarios').select('*').order('data', { ascending: false });
      if (error) throw new Error(formatSupabaseError(error));
      return data as Comentario[];
    },
    async save(comentario: Partial<Comentario>) {
      const { data, error } = await supabase.from('comentarios').upsert(comentario).select().single();
      if (error) throw new Error(formatSupabaseError(error));
      return data;
    },
    async delete(id: string) {
      const { error } = await supabase.from('comentarios').delete().eq('id', id);
      if (error) throw new Error(formatSupabaseError(error));
    }
  },
  users: {
    async fetchAll() {
      const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
      if (error) throw new Error(formatSupabaseError(error));
      return data as User[];
    },
    async create(user: Partial<User>) {
      const { data, error } = await supabase.from('users').insert([user]).select().single();
      if (error) throw new Error(formatSupabaseError(error));
      return data;
    },
    async update(userId: string, updates: Partial<User>) {
      const { error } = await supabase.from('users').update(updates).eq('id', userId);
      if (error) throw new Error(formatSupabaseError(error));
    },
    async updateRole(userId: string, role: string) {
      const { error } = await supabase.from('users').update({ role }).eq('id', userId);
      if (error) throw new Error(formatSupabaseError(error));
    },
    async updatePassword(userId: string, password: string) {
      const { error } = await supabase.from('users').update({ password }).eq('id', userId);
      if (error) throw new Error(formatSupabaseError(error));
    },
    async delete(userId: string) {
      const { error } = await supabase.from('users').delete().eq('id', userId);
      if (error) throw new Error(formatSupabaseError(error));
    }
  },
  system: {
    async getSetting(key: string) {
      const { data, error } = await supabase.from('system_settings').select('value').eq('key', key).maybeSingle();
      if (error) return null;
      return data?.value;
    },
    async setSetting(key: string, value: string) {
      await supabase.from('system_settings').upsert({ key, value });
    },
    async clearAllData() {
      await Promise.all([
        supabase.from('notas_fiscais').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('comentarios').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      ]);
    },
    async restoreFromSnapshot(snapshot: AppState) {
      await this.clearAllData();
      const cleanNotas = (snapshot.notas || []).map(({ id, ...rest }) => rest);
      const cleanComentarios = (snapshot.comentarios || []).map(({ id, ...rest }) => rest);
      if (cleanNotas.length > 0) await supabase.from('notas_fiscais').insert(cleanNotas);
      if (cleanComentarios.length > 0) await supabase.from('comentarios').insert(cleanComentarios);
    },
    async createBackup(snapshot: AppState, tipo: 'manual' | 'automatico' = 'manual') {
      const { data, error } = await supabase.from('backups').insert([{ data_snapshot: snapshot, tipo }]).select().single();
      if (error) throw new Error(formatSupabaseError(error));
      return data;
    },
    async fetchBackups() {
      const { data, error } = await supabase.from('backups').select('*').order('created_at', { ascending: false });
      if (error) throw new Error(formatSupabaseError(error));
      return (data || []) as Backup[];
    }
  }
};
