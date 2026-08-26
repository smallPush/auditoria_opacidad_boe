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
  try {
    if (typeof import.meta !== 'object' || typeof import.meta.glob !== 'function') {
      return [];
    }
    const auditedFiles = import.meta.glob('../audited_reports/Audit_*.json', { eager: true });
    const indexFiles = import.meta.glob('../audited_reports/BOE_Audit_Index_*.json', { eager: true });

    const indexData: BOEAuditIndexItem[] = [];
    Object.values(indexFiles).forEach((mod: unknown) => {
      const content = (mod && typeof mod === 'object' && 'default' in mod ? (mod as { default: unknown }).default : mod);
      if (Array.isArray(content)) {
        indexData.push(...content);
      }
    });

    const localAudits: AuditHistoryItem[] = [];

    // Index indexData for faster lookup
    const indexMap = new Map<string, BOEAuditIndexItem>();
    indexData.forEach(idx => {
      if (idx && idx.id) {
        indexMap.set(idx.id, idx);
      }
    });

    Object.values(auditedFiles).forEach((mod: unknown) => {
      const data = (mod && typeof mod === 'object' && 'default' in mod ? (mod as { default: unknown }).default : mod) as { boe_id?: string; report?: BOEAuditResponse; title?: string; timestamp?: string };
      if (data && data.boe_id && data.report) {
        const indexEntry = indexMap.get(data.boe_id);
        localAudits.push({
          boeId: data.boe_id,
          title: indexEntry?.titulo || data.title || data.boe_id,
          audit: data.report,
          timestamp: data.timestamp ? new Date(data.timestamp).getTime() : Date.now()
        });
      }
    });

    return localAudits;
  } catch (err) {
    console.warn('Failed to load bundled audits:', err);
    return [];
  }
};

const getLocalStorage = (): Storage | null => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    if (typeof localStorage !== 'undefined') {
      return localStorage;
    }
  } catch {
    // Restricted storage environment
  }
  return null;
};

export const getAuditHistory = async (): Promise<AuditHistoryItem[]> => {
  let remoteData: AuditHistoryItem[] = [];

  // Try to get from Supabase
  if (supabase) {
    try {
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
    } catch (err) {
      console.warn('Error fetching from Supabase:', err);
    }
  }

  // Get from LocalStorage safely
  let localStorageData: AuditHistoryItem[] = [];
  try {
    const storage = getLocalStorage();
    if (storage) {
      const localRaw = storage.getItem(STORAGE_KEYS.AUDIT_HISTORY);
      if (localRaw) {
        const parsed = JSON.parse(localRaw);
        if (Array.isArray(parsed)) {
          localStorageData = parsed;
        }
      }
    }
  } catch (err) {
    console.warn('Failed to read audit history from localStorage:', err);
  }

  // Get from audited_reports folder (bundled with the app)
  const auditedFolderData = loadLocalAudits();

  // Merge data (prioritize remote > folder local > localStorage)
  const mergedMap = new Map<string, AuditHistoryItem>();

  // 1. LocalStorage data (lowest priority)
  for (let i = 0; i < localStorageData.length; i++) {
    const item = localStorageData[i];
    if (item && item.boeId && item.audit) {
      mergedMap.set(item.boeId, item);
    }
  }

  // 2. Bundled folder data (medium priority, overwrites localStorage)
  for (let i = 0; i < auditedFolderData.length; i++) {
    const item = auditedFolderData[i];
    if (item && item.boeId && item.audit) {
      mergedMap.set(item.boeId, item);
    }
  }

  // 3. Remote data (highest priority, overwrites previous)
  for (let i = 0; i < remoteData.length; i++) {
    const item = remoteData[i];
    if (item && item.boeId && item.audit) {
      mergedMap.set(item.boeId, item);
    }
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

  // Save to LocalStorage safely (capped to recent items to prevent quota overflow)
  try {
    const storage = getLocalStorage();
    if (storage) {
      const localRaw = storage.getItem(STORAGE_KEYS.AUDIT_HISTORY);
      const localData: AuditHistoryItem[] = localRaw ? JSON.parse(localRaw) : [];
      const filteredLocal = Array.isArray(localData) ? localData.filter(item => item && item.boeId !== boeId) : [];
      const cappedLocal = [newItem, ...filteredLocal].slice(0, 100);
      storage.setItem(STORAGE_KEYS.AUDIT_HISTORY, JSON.stringify(cappedLocal));
    }
  } catch (err) {
    console.warn('Failed to save audit to localStorage:', err);
  }

  // Save to Local File System (Bridge) if in development
  if (import.meta.env.DEV) {
    try {
      await fetch('/api/save-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Bridge-Secret': import.meta.env.VITE_BRIDGE_SECRET },
        body: JSON.stringify({ boeId, title, audit })
      });
    } catch (err) {
      console.warn('Local bridge save failed (expected if not using vite dev server):', err);
    }
  }

  // Save to Supabase (if available)
  if (supabase) {
    try {
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
    } catch (err) {
      console.error('Exception saving to Supabase:', err);
    }
  }
};

export const clearLocalHistory = () => {
  try {
    const storage = getLocalStorage();
    if (storage) {
      storage.removeItem(STORAGE_KEYS.AUDIT_HISTORY);
    }
  } catch (err) {
    console.warn('Failed to clear local history:', err);
  }
};
