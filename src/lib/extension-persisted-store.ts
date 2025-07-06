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

// Global map to ensure one store instance per key
const globalStoreMap = new Map<string, ExtensionPersistedStore<any>>();

export function extensionPersisted<T>(key: string, initialValue: T): ExtensionPersistedStore<T> {
    // Early return for localStorage fallback when Tampermonkey not available
    if (typeof window.TampermonkeyStorage === "undefined") {
        console.log(
            `ExtensionPersistedStore[${key}]: Using localStorage via svelte-persisted-store`,
        );
        return persisted(key, initialValue) as ExtensionPersistedStore<T>;
    }

    // Return existing store if already created for this key
    if (globalStoreMap.has(key)) {
        console.log(`ExtensionPersistedStore[${key}]: Returning existing store`);
        return globalStoreMap.get(key)! as ExtensionPersistedStore<T>;
    }

    // Create new store for this key
    const store = writable<T>(initialValue);
    let isInitialized = false;

    console.log(`ExtensionPersistedStore[${key}]: Creating new store with Tampermonkey storage`);

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

    // Listen for changes from other tabs/contexts
    if (window.TampermonkeyStorage.addValueChangeListener) {
        window.TampermonkeyStorage.addValueChangeListener(
            key,
            (changedKey, oldValue, newValue, remote) => {
                // Only handle changes from other contexts (remote=true)
                if (remote && changedKey === key) {
                    try {
                        if (newValue !== null) {
                            const parsedValue = JSON.parse(newValue);
                            store.set(parsedValue);
                            console.log(
                                `ExtensionPersistedStore[${key}]: Synced from other context:`,
                                parsedValue,
                            );
                        } else {
                            // Value was deleted in another context
                            store.set(initialValue);
                            console.log(
                                `ExtensionPersistedStore[${key}]: Value deleted in other context, reset to initial value`,
                            );
                        }
                    } catch (error) {
                        console.error(`Failed to sync value change for key "${key}":`, error);
                    }
                }
            },
        );
    }

    // Initialize the store
    initializeStore();

    const extensionStore: ExtensionPersistedStore<T> = {
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

    // Store in global map
    globalStoreMap.set(key, extensionStore);

    return extensionStore;
}
