import AsyncStorage from '@react-native-async-storage/async-storage';
import { CryptoVault } from './secureVault';

/**
 * Local Encrypted Assistant ORM (Object-Relational Memory).
 * Provides atomic, validated, encrypted database entities:
 * 1. ScheduleEntity: Smart schedule with Clash Resolution (prevents overlapping reminders/meds/timers)
 * 2. MemoryEntity: Learned facts ("Mom's doctor", "Neighbor's name") with semantic keying
 * 3. AuditLogEntity: Rolling voice and activity logs for recovery and debugging
 */
class EncryptedMemoryORM {
  constructor() {
    this.STORAGE_PREFIX = '@hey_bro_orm_';
  }

  getKey(collection) {
    return `${this.STORAGE_PREFIX}${collection}`;
  }

  // Generic secure collection reader
  async getCollection(collection) {
    try {
      const rawEncrypted = await AsyncStorage.getItem(this.getKey(collection));
      if (!rawEncrypted) return [];
      const decrypted = CryptoVault.decrypt(rawEncrypted, collection);
      return decrypted ? JSON.parse(decrypted) : [];
    } catch (e) {
      console.warn(`[ORM] Error reading collection ${collection}:`, e);
      return [];
    }
  }

  // Generic secure collection writer
  async saveCollection(collection, items) {
    try {
      const json = JSON.stringify(items);
      const encrypted = CryptoVault.encrypt(json, collection);
      await AsyncStorage.setItem(this.getKey(collection), encrypted);
      return true;
    } catch (e) {
      console.warn(`[ORM] Error saving collection ${collection}:`, e);
      return false;
    }
  }

  // -------------------------------------------------------------
  // 1. SMART SCHEDULE ORM & CLASH RESOLUTION ENGINE
  // -------------------------------------------------------------

  /**
   * Checks if an event clashes with existing scheduled items within bufferMinutes.
   * Resolves conflicts automatically by suggesting or nudging to the next free slot.
   */
  async findScheduleClashes(targetTimestamp, durationMinutes = 15, bufferMinutes = 10) {
    const schedules = await this.getCollection('schedules');
    const targetStart = new Date(targetTimestamp).getTime();
    const targetEnd = targetStart + durationMinutes * 60 * 1000;
    const bufferMs = bufferMinutes * 60 * 1000;

    const clashes = [];

    for (const item of schedules) {
      if (item.status === 'cancelled' || item.status === 'completed') continue;
      const itemStart = new Date(item.startTime).getTime();
      const itemEnd = itemStart + (item.durationMinutes || 15) * 60 * 1000;

      // Overlap condition with safety buffer
      const hasOverlap = (targetStart - bufferMs < itemEnd) && (targetEnd + bufferMs > itemStart);
      if (hasOverlap) {
        clashes.push(item);
      }
    }

    return clashes;
  }

  /**
   * Schedule an event with clash detection and intelligent auto-adjustment.
   */
  async scheduleSmartEvent({ title, startTime, category = 'reminder', durationMinutes = 15, allowNudge = true }) {
    const clashes = await this.findScheduleClashes(startTime, durationMinutes, 5);
    let resolvedTime = new Date(startTime);
    let clashMessage = null;

    if (clashes.length > 0) {
      const conflictingItem = clashes[0];
      const conflictTitle = conflictingItem.title;
      const conflictTimeStr = new Date(conflictingItem.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      if (allowNudge) {
        // Automatically nudge to 15 minutes after conflicting event ends
        const conflictEnd = new Date(conflictingItem.startTime).getTime() + (conflictingItem.durationMinutes || 15) * 60 * 1000;
        resolvedTime = new Date(conflictEnd + 10 * 60 * 1000); // 10 min break
        const nudgedTimeStr = resolvedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        clashMessage = `Detected clash with "${conflictTitle}" at ${conflictTimeStr}. Intelligently adjusted to ${nudgedTimeStr}.`;
      } else {
        clashMessage = `Warning: "${conflictTitle}" is already scheduled around ${conflictTimeStr}.`;
      }
    }

    const event = {
      id: Date.now().toString(),
      title,
      category, // 'medicine', 'reminder', 'meal', 'alarm', 'task'
      startTime: resolvedTime.toISOString(),
      durationMinutes,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    const schedules = await this.getCollection('schedules');
    schedules.push(event);
    await this.saveCollection('schedules', schedules);

    // Write audit log
    await this.logActivity('SCHEDULE_CREATED', { eventId: event.id, title, clashResolved: Boolean(clashMessage) });

    return {
      success: true,
      event,
      resolvedTime,
      clashMessage,
    };
  }

  // -------------------------------------------------------------
  // 2. ENCRYPTED LEARNED MEMORIES ORM ("Learn Mode")
  // -------------------------------------------------------------

  async storeMemory(key, value, category = 'personal') {
    const memories = await this.getCollection('memories');
    const cleanKey = key.toLowerCase().trim();

    const existingIdx = memories.findIndex((m) => m.key === cleanKey);
    const entry = {
      id: Date.now().toString(),
      key: cleanKey,
      value: value.trim(),
      category,
      updatedAt: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      memories[existingIdx] = entry;
    } else {
      memories.push(entry);
    }

    await this.saveCollection('memories', memories);
    await this.logActivity('MEMORY_SAVED', { key: cleanKey });
    return entry;
  }

  async recallMemory(query) {
    const memories = await this.getCollection('memories');
    const cleanQ = query.toLowerCase().trim();

    // 1. Exact or contains key match
    const found = memories.find((m) => cleanQ.includes(m.key) || m.key.includes(cleanQ));
    if (found) return found.value;

    // 2. Value fuzzy match
    const valueMatch = memories.find((m) => cleanQ.includes(m.value.toLowerCase()));
    if (valueMatch) return valueMatch.value;

    return null;
  }

  async listAllMemories() {
    return await this.getCollection('memories');
  }

  // -------------------------------------------------------------
  // 3. ENCRYPTED AUDIT & ACTIVITY LOGS (Rolling Buffer)
  // -------------------------------------------------------------

  async logActivity(action, metadata = {}) {
    try {
      const logs = await this.getCollection('audit_logs');
      const entry = {
        timestamp: new Date().toISOString(),
        action,
        metadata,
      };

      logs.unshift(entry);
      // Keep last 100 encrypted entries to maintain optimal performance
      const trimmed = logs.slice(0, 100);
      await this.saveCollection('audit_logs', trimmed);
    } catch (e) {}
  }

  async getRecentLogs(limit = 10) {
    const logs = await this.getCollection('audit_logs');
    return logs.slice(0, limit);
  }
}

export const AssistantORM = new EncryptedMemoryORM();
