/**
 * services/historyService.ts
 * Shared history logic — AsyncStorage-backed tool view tracking.
 * Kept outside app/ to avoid Expo Router treating it as a route.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const HISTORY_STORAGE_KEY = '@mg_tool_history_v1';
export const MAX_HISTORY_ITEMS = 50;

export interface HistoryEntry {
  toolId: string;
  viewedAt: string; // ISO timestamp
}

/** Append or update a tool visit in history */
export async function recordToolView(toolId: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);
    const history: HistoryEntry[] = raw ? JSON.parse(raw) : [];
    // Remove existing entry for same toolId, then prepend fresh one
    const filtered = history.filter(e => e.toolId !== toolId);
    const updated: HistoryEntry[] = [
      { toolId, viewedAt: new Date().toISOString() },
      ...filtered,
    ];
    await AsyncStorage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify(updated.slice(0, MAX_HISTORY_ITEMS)),
    );
  } catch {
    // Silently fail — history is non-critical
  }
}
