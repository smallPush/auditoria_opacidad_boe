/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';
import { AuditHistoryItem, BOEAuditResponse } from '../types';

const supabaseUrl = (process.env as any).SUPABASE_URL || '';
const supabaseKey = (process.env as any).SUPABASE_ANON_KEY || '';

export const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey)
  : null;

const LOCAL_STORAGE_KEY = 'boe_audit_history_v1';

const loadLocalAudits = (): AuditHistoryItem[] => {
  const auditedFiles = import.meta.glob('../audited_reports/Audit_*.json', { eager: true });
  const indexFiles = import.meta.glob('../audited_reports/BOE_Audit_Index_*.json', { eager: true });

  const indexData: any[] = [];
  Object.values(indexFiles).forEach((mod: any) => {
    if (Array.isArray(mod.default)) {
      indexData.push(...mod.default);
    }
  });

  const localAudits: AuditHistoryItem[] = [];

  Object.values(auditedFiles).forEach((mod: any) => {
    const data = mod.default;
    if (data && data.boe_id && data.report) {
      const indexEntry = indexData.find(idx => idx.id === data.boe_id);
      localAudits.push({
        boeId: data.boe_id,
        title: indexEntry?.titulo || data.title || data.boe_id,
        audit: data.report as BOEAuditResponse,
        timestamp: data.timestamp ? new Date(data.timestamp).getTime() : Date.now()
      });
    }
  });

  return localAudits;
};

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
  const localStorageData: AuditHistoryItem[] = localRaw ? JSON.parse(localRaw) : [];

  // Obtener de carpeta audited_reports (empaquetados con la app)
  const auditedFolderData = loadLocalAudits();

  // Fusionar datos (priorizar remotos, luego locales de carpeta, finalmente localStorage)
  const merged = [...remoteData];

  // Añadir datos de la carpeta si no están ya (por boeId)
  auditedFolderData.forEach(folderItem => {
    if (!merged.find(m => m.boeId === folderItem.boeId)) {
      merged.push(folderItem);
    }
  });

  // Añadir datos de localStorage si no están ya
  localStorageData.forEach(localItem => {
    if (!merged.find(m => m.boeId === localItem.boeId)) {
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
