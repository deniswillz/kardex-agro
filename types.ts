
export type UserRole = 'admin' | 'editor' | 'operador' | 'guest';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  password?: string;
  created_at?: string;
}

export interface NotaFiscal {
  id: string;
  data: string;
  numero: string;
  fornecedor: string;
  conferente: string;
  tipo: 'Nacional' | 'Importado' | 'Retorno' | 'Devolução' | '';
  observacao: string;
  created_by?: string;
}

export interface OrdemProducao {
  id: string;
  data: string;
  numero: string;
  documento: string;
  conferente: string;
  status: 'Em Separação' | 'Concluída';
  tipo: 'Chicote' | 'Mecânica' | 'Eletrônica' | 'Engenharia' | 'P&D' | '';
  observacao: string;
  created_by?: string;
}

export interface Comentario {
  id: string;
  data: string;
  texto: string;
  created_by?: string;
}

export interface AppState {
  notas: NotaFiscal[];
  ordens: OrdemProducao[];
  comentarios: Comentario[];
}

export interface Backup {
  id: string;
  created_at: string;
  data_snapshot: AppState;
  tipo: 'manual' | 'automatico';
}
