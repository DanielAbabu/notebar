import { Note, Task, Theme, Drawing, FontChoice } from '../types';

export interface StorageData {
    qn_notes: Note[];
    qn_tasks: Task[];
    qn_theme: Theme;
    qn_drawings: Drawing[];
    qn_font: FontChoice;
}

const ALL_KEYS = ['qn_notes', 'qn_tasks', 'qn_theme', 'qn_drawings', 'qn_font'] as const;

class StorageService {
    private isExtension = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;

    async get<K extends keyof StorageData>(key: K): Promise<StorageData[K] | null> {
        if (this.isExtension) {
            return new Promise((resolve) => {
                try {
                    chrome.storage.local.get([key], (result) => {
                        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.lastError) {
                            console.warn('Storage get error:', chrome.runtime.lastError.message);
                            resolve(null);
                            return;
                        }
                        resolve((result && result[key] as StorageData[K]) ?? null);
                    });
                } catch (e) {
                    console.error('Storage get exception:', e);
                    resolve(null);
                }
            });
        } else {
            try {
                const data = localStorage.getItem(key);
                return data ? JSON.parse(data) : null;
            } catch (e) {
                console.error('LocalStorage parse error:', e);
                return null;
            }
        }
    }

    async set<K extends keyof StorageData>(key: K, value: StorageData[K]): Promise<void> {
        if (this.isExtension) {
            return new Promise((resolve) => {
                try {
                    chrome.storage.local.set({ [key]: value }, () => {
                        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.lastError) {
                            console.warn('Storage set error:', chrome.runtime.lastError.message);
                        }
                        resolve();
                    });
                } catch (e) {
                    console.error('Storage set exception:', e);
                    resolve();
                }
            });
        } else {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (e) {
                console.error('LocalStorage set error:', e);
            }
        }
    }

    async getAll(): Promise<StorageData> {
        const emptyFallback: StorageData = {
            qn_notes: [],
            qn_tasks: [],
            qn_theme: 'light',
            qn_drawings: [],
            qn_font: 'outfit'
        };

        if (this.isExtension) {
            return new Promise((resolve) => {
                try {
                    chrome.storage.local.get([...ALL_KEYS], (result) => {
                        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.lastError) {
                            console.warn('Storage getAll error:', chrome.runtime.lastError.message);
                            resolve(emptyFallback);
                            return;
                        }

                        const res = result || {};
                        // Check if chrome.storage.local has any data; if empty, check if legacy localStorage has data to migrate
                        const hasDataInExtension = ALL_KEYS.some(k => res[k] !== undefined && res[k] !== null);
                        if (!hasDataInExtension && typeof localStorage !== 'undefined') {
                            try {
                                const legacyData: Record<string, any> = {};
                                let foundLegacy = false;
                                ALL_KEYS.forEach(key => {
                                    const raw = localStorage.getItem(key);
                                    if (raw) {
                                        legacyData[key] = JSON.parse(raw);
                                        foundLegacy = true;
                                    }
                                });
                                if (foundLegacy) {
                                    chrome.storage.local.set(legacyData);
                                    resolve({
                                        qn_notes: (legacyData.qn_notes as Note[]) ?? null,
                                        qn_tasks: (legacyData.qn_tasks as Task[]) ?? null,
                                        qn_theme: (legacyData.qn_theme as Theme) ?? null,
                                        qn_drawings: (legacyData.qn_drawings as Drawing[]) ?? null,
                                        qn_font: (legacyData.qn_font as FontChoice) ?? null,
                                    } as StorageData);
                                    return;
                                }
                            } catch (e) {
                                console.error('Storage migration check error:', e);
                            }
                        }

                        resolve({
                            qn_notes: (res.qn_notes as Note[]) ?? null,
                            qn_tasks: (res.qn_tasks as Task[]) ?? null,
                            qn_theme: (res.qn_theme as Theme) ?? null,
                            qn_drawings: (res.qn_drawings as Drawing[]) ?? null,
                            qn_font: (res.qn_font as FontChoice) ?? null,
                        } as StorageData);
                    });
                } catch (e) {
                    console.error('Storage getAll exception:', e);
                    resolve(emptyFallback);
                }
            });
        } else {
            const read = (key: string) => {
                try {
                    const raw = localStorage.getItem(key);
                    return raw ? JSON.parse(raw) : null;
                } catch (e) {
                    console.error('LocalStorage read error:', key, e);
                    return null;
                }
            };
            return {
                qn_notes: read('qn_notes'),
                qn_tasks: read('qn_tasks'),
                qn_theme: read('qn_theme'),
                qn_drawings: read('qn_drawings'),
                qn_font: read('qn_font'),
            } as StorageData;
        }
    }

    async saveAll(data: Partial<StorageData>): Promise<void> {
        if (this.isExtension) {
            return new Promise((resolve) => {
                try {
                    chrome.storage.local.set(data, () => {
                        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.lastError) {
                            console.warn('Storage saveAll error:', chrome.runtime.lastError.message);
                        }
                        resolve();
                    });
                } catch (e) {
                    console.error('Storage saveAll exception:', e);
                    resolve();
                }
            });
        } else {
            try {
                Object.entries(data).forEach(([key, value]) => {
                    localStorage.setItem(key, JSON.stringify(value));
                });
            } catch (e) {
                console.error('LocalStorage saveAll error:', e);
            }
        }
    }
}

export const storage = new StorageService();
