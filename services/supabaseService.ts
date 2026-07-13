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
  Object.values(indexFiles).forEach((mod: unknown) => {
    if (mod && typeof mod === 'object' && 'default' in mod && Array.isArray(mod.default)) {
      indexData.push(...mod.default);
    }
  });

  const localAudits: AuditHistoryItem[] = [];

  // Index indexData for faster lookup
  const indexMap = new Map<string, BOEAuditIndexItem>();
  indexData.forEach(idx => indexMap.set(idx.id, idx));

  Object.values(auditedFiles).forEach((mod: unknown) => {
    if (mod && typeof mod === 'object' && 'default' in mod) {
      const data = mod.default as { boe_id?: string; report?: BOEAuditResponse; title?: string; timestamp?: string };
      if (data && data.boe_id && data.report) {
        const indexEntry = indexMap.get(data.boe_id);
        localAudits.push({
          boeId: data.boe_id,
          title: indexEntry?.titulo || data.title || data.boe_id,
          audit: data.report,
          timestamp: data.timestamp ? new Date(data.timestamp).getTime() : Date.now()
        });
      }
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
  await saveAuditsToDB([{ boeId, title, audit }]);
};

export const saveAuditsToDB = async (items: { boeId: string; title: string; audit: BOEAuditResponse }[]) => {
  const now = Date.now();
  const newItems: AuditHistoryItem[] = items.map(item => ({
    ...item,
    timestamp: now
  }));

  // 1. Save to LocalStorage (Bulk)
  const localRaw = localStorage.getItem(STORAGE_KEYS.AUDIT_HISTORY);
  const localData: AuditHistoryItem[] = localRaw ? JSON.parse(localRaw) : [];

  const newBoeIds = new Set(newItems.map(item => item.boeId));
  const filteredLocal = localData.filter(item => !newBoeIds.has(item.boeId));

  localStorage.setItem(STORAGE_KEYS.AUDIT_HISTORY, JSON.stringify([...newItems, ...filteredLocal]));

  // 2. Save to Local File System (Bridge) if in development
  if (import.meta.env.DEV) {
    try {
      // If single item, use existing endpoint for backward compatibility (optional but safer)
      // or just always use bulk if we update the bridge.
      // Let's use bulk if more than one, or always bulk if we are confident.
      const endpoint = items.length > 1 ? '/api/save-audits-bulk' : '/api/save-audit';
      const body = items.length > 1 ? JSON.stringify({ items }) : JSON.stringify(items[0]);

      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Bridge-Secret': import.meta.env.VITE_BRIDGE_SECRET },
        body
      });
    } catch (err) {
      console.warn('Local bridge save failed (expected if not using vite dev server):', err);
    }
  }

  // 3. Save to Supabase (Bulk Upsert)
  if (supabase) {
    const { error } = await supabase
      .from('boe_audits')
      .upsert(
        items.map(item => ({
          boe_id: item.boeId,
          title: item.title,
          audit: item.audit,
          created_at: new Date(now).toISOString()
        })),
        { onConflict: 'boe_id' }
      );

    if (error) {
      console.error('Error saving to Supabase, but saved to local:', error);
    }
  }
};

export const clearLocalHistory = () => {
  localStorage.removeItem(STORAGE_KEYS.AUDIT_HISTORY);
};
