
import { createClient } from '@supabase/supabase-js';
import { AuditHistoryItem, BOEAuditResponse } from '../types';

const supabaseUrl = (process.env as any).SUPABASE_URL || '';
const supabaseKey = (process.env as any).SUPABASE_ANON_KEY || '';

export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

const LOCAL_STORAGE_KEY = 'boe_audit_history_v1';

export const getAuditHistory = async (): Promise<AuditHistoryItem[]> => {
  let remoteData: AuditHistoryItem[] = [];
  
  // Intentar obtener de Supabase
  if (supabase) {
    const { data, error } = await supabase
      .from('boe_audits')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      remoteData = data.map(item => ({
        boeId: item.boe_id,
        title: item.title,
        audit: item.audit as BOEAuditResponse,
        timestamp: new Date(item.created_at).getTime()
      }));
    }
  }

  // Obtener de LocalStorage
  const localRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
  const localData: AuditHistoryItem[] = localRaw ? JSON.parse(localRaw) : [];

  // Fusionar datos (priorizar remotos pero mantener locales si no hay conexión)
  const merged = [...remoteData];
  localData.forEach(localItem => {
    if (!merged.find(remoteItem => remoteItem.boeId === localItem.boeId)) {
      merged.push(localItem);
    }
  });

  return merged.sort((a, b) => b.timestamp - a.timestamp);
};

export const saveAuditToDB = async (boeId: string, title: string, audit: BOEAuditResponse) => {
  const newItem: AuditHistoryItem = {
    boeId,
    title,
    audit,
    timestamp: Date.now()
  };

  // Guardar en LocalStorage (siempre)
  const localRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
  const localData: AuditHistoryItem[] = localRaw ? JSON.parse(localRaw) : [];
  const filteredLocal = localData.filter(item => item.boeId !== boeId);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([newItem, ...filteredLocal]));

  // Guardar en Supabase (si está disponible)
  if (supabase) {
    const { error } = await supabase
      .from('boe_audits')
      .upsert({ 
        boe_id: boeId, 
        title, 
        audit,
        created_at: new Date().toISOString()
      }, { onConflict: 'boe_id' });

    if (error) {
      console.error('Error saving to Supabase, but saved to local:', error);
    }
  }
};

export const clearLocalHistory = () => {
  localStorage.removeItem(LOCAL_STORAGE_KEY);
};
