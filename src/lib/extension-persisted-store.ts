// Custom persisted store that works with Tampermonkey storage or falls back to svelte-persisted-store
import { writable, type Writable } from "svelte/store";
import { persisted } from "svelte-persisted-store";

export interface ExtensionPersistedStore<T> extends Writable<T> {
    reset(): void;
}

// Global interface for Tampermonkey storage exposed to page context
declare global {
    interface Window {
        TampermonkeyStorage?: {
            getValue: (key: string, defaultValue?: any) => any;
            setValue: (key: string, value: any) => void;
            deleteValue: (key: string) => void;
            listValues: () => string[];
            addValueChangeListener: (
                key: string,
                callback: (key: string, oldValue: any, newValue: any, remote: boolean) => void,
            ) => string;
        };
    }
}

// Helper function to detect if Tampermonkey is available
function hasTampermonkey(): boolean {
    return typeof window.TampermonkeyStorage !== "undefined";
}

export function extensionPersisted<T>(key: string, initialValue: T): ExtensionPersistedStore<T> {
    // Check if Tampermonkey is available
    if (hasTampermonkey()) {
        // Use Tampermonkey storage with our custom implementation
        const store = writable<T>(initialValue);
        let isInitialized = false;

        console.log(`ExtensionPersistedStore[${key}]: Using Tampermonkey storage`);

        // Initialize store with value from Tampermonkey storage
        const initializeStore = async () => {
            if (isInitialized) return;

            try {
                const storedValue = window.TampermonkeyStorage!.getValue(key, null);
                if (storedValue !== null) {
                    const parsedValue = JSON.parse(storedValue);
                    store.set(parsedValue);
                    console.log(
                        `ExtensionPersistedStore[${key}]: Loaded from Tampermonkey storage:`,
                        parsedValue,
                    );
                } else {
                    console.log(
                        `ExtensionPersistedStore[${key}]: No stored value found, using initial value`,
                    );
                }
                isInitialized = true;
            } catch (error) {
                console.error(`Failed to initialize persisted store for key "${key}":`, error);
                isInitialized = true;
            }
        };

        // Subscribe to store changes and persist them
        store.subscribe(async (value) => {
            if (!isInitialized) return;

            try {
                window.TampermonkeyStorage!.setValue(key, JSON.stringify(value));
            } catch (error) {
                console.error(`Failed to persist store value for key "${key}":`, error);
            }
        });

        // Initialize the store
        initializeStore();

        return {
            ...store,
            reset: async () => {
                try {
                    window.TampermonkeyStorage!.deleteValue(key);
                    store.set(initialValue);
                } catch (error) {
                    console.error(`Failed to reset persisted store for key "${key}":`, error);
                }
            },
        };
    } else {
        // Fallback to svelte-persisted-store for localStorage
        console.log(
            `ExtensionPersistedStore[${key}]: Using localStorage via svelte-persisted-store`,
        );
        return persisted(key, initialValue) as ExtensionPersistedStore<T>;
    }
}

// Helper function to migrate from regular localStorage to Tampermonkey storage
export async function migrateFromLocalStorage(key: string): Promise<string | null> {
    try {
        // Check if we have data in regular localStorage
        const localStorageValue = localStorage.getItem(key);
        if (localStorageValue !== null && window.TampermonkeyStorage) {
            // Migrate to Tampermonkey storage
            window.TampermonkeyStorage.setValue(key, localStorageValue);
            // Remove from localStorage to avoid conflicts
            localStorage.removeItem(key);
            return localStorageValue;
        }
        return null;
    } catch (error) {
        console.error(`Failed to migrate localStorage key "${key}":`, error);
        return null;
    }
}
