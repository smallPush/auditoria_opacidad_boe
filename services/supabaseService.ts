/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';
import { AuditHistoryItem, BOEAuditResponse, BOEAuditIndexItem } from '../types';
import { STORAGE_KEYS } from '../constants';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey)
  : null;

const loadLocalAudits = (): AuditHistoryItem[] => {
  const auditedFiles = import.meta.glob('../audited_reports/Audit_*.json', { eager: true });
  const indexFiles = import.meta.glob('../audited_reports/BOE_Audit_Index_*.json', { eager: true });

  const indexData: BOEAuditIndexItem[] = [];
  Object.values(indexFiles).forEach((mod: { default: BOEAuditIndexItem[] } | unknown) => {
    if (mod && typeof mod === 'object' && 'default' in mod && Array.isArray((mod as any).default)) {
      indexData.push(...(mod as any).default);
    }
  });

  const localAudits: AuditHistoryItem[] = [];

  // Index indexData for faster lookup
  const indexMap = new Map<string, BOEAuditIndexItem>();
  indexData.forEach(idx => indexMap.set(idx.id, idx));

  Object.values(auditedFiles).forEach((mod: any) => {
    const data = mod.default;
    if (data && data.boe_id && data.report) {
      const indexEntry = indexMap.get(data.boe_id);
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

  // Try to get from Supabase
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

  // Get from LocalStorage
  const localRaw = localStorage.getItem(STORAGE_KEYS.AUDIT_HISTORY);
  const localStorageData: AuditHistoryItem[] = localRaw ? JSON.parse(localRaw) : [];

  // Get from audited_reports folder (bundled with the app)
  const auditedFolderData = loadLocalAudits();

  // Merge data (prioritize remote > folder local > localStorage)
  // Use a Map to efficiently deduplicate while maintaining priorities
  const mergedMap = new Map<string, AuditHistoryItem>();
  const localIds = new Set<string>();

  // 1. Load current IDs from LocalStorage and add to map (low priority)
  for (let i = 0; i < localStorageData.length; i++) {
    const item = localStorageData[i];
    localIds.add(item.boeId);
    mergedMap.set(item.boeId, item);
  }

  // 2. Process folder data (medium priority, overwrites local if matches)
  let localStorageUpdated = false;
  for (let i = 0; i < auditedFolderData.length; i++) {
    const item = auditedFolderData[i];
    mergedMap.set(item.boeId, item);
    if (!localIds.has(item.boeId)) {
      localStorageData.push(item);
      localIds.add(item.boeId);
      localStorageUpdated = true;
    }
  }

  // 3. Process remote data (high priority, overwrites previous)
  for (let i = 0; i < remoteData.length; i++) {
    const item = remoteData[i];
    mergedMap.set(item.boeId, item);
  }

  // Save to LocalStorage if folder synchronization occurred
  if (localStorageUpdated) {
    localStorage.setItem(STORAGE_KEYS.AUDIT_HISTORY, JSON.stringify(localStorageData));
  }

  return Array.from(mergedMap.values()).sort((a, b) => b.timestamp - a.timestamp);
};

export const saveAuditToDB = async (boeId: string, title: string, audit: BOEAuditResponse) => {
  const newItem: AuditHistoryItem = {
    boeId,
    title,
    audit,
    timestamp: Date.now()
  };

  // Save to LocalStorage (always)
  const localRaw = localStorage.getItem(STORAGE_KEYS.AUDIT_HISTORY);
  const localData: AuditHistoryItem[] = localRaw ? JSON.parse(localRaw) : [];
  const filteredLocal = localData.filter(item => item.boeId !== boeId);
  localStorage.setItem(STORAGE_KEYS.AUDIT_HISTORY, JSON.stringify([newItem, ...filteredLocal]));

  // Save to Local File System (Bridge) if in development
  if (import.meta.env.DEV) {
    try {
      await fetch('/api/save-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boeId, title, audit })
      });
    } catch (err) {
      console.warn('Local bridge save failed (expected if not using vite dev server):', err);
    }
  }

  // Save to Supabase (if available)
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
  localStorage.removeItem(STORAGE_KEYS.AUDIT_HISTORY);
};
