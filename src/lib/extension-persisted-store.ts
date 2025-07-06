// Custom persisted store that works with extension storage bridge and localStorage fallback
import { writable, type Writable } from "svelte/store";
import { extensionStorage, getStorageType } from "./extension-bridge";

export interface ExtensionPersistedStore<T> extends Writable<T> {
    reset(): void;
}

// Storage adapter that automatically chooses the best storage method
class StorageAdapter {
    private storageType: "tampermonkey" | "localStorage";

    constructor() {
        this.storageType = getStorageType();
    }

    async getItem(key: string): Promise<string | null> {
        // Always use extensionStorage which handles all cases internally
        return await extensionStorage.getItem(key);
    }

    async setItem(key: string, value: string): Promise<void> {
        // Always use extensionStorage which handles all cases internally
        await extensionStorage.setItem(key, value);
    }

    async removeItem(key: string): Promise<void> {
        // Always use extensionStorage which handles all cases internally
        await extensionStorage.removeItem(key);
    }

    getStorageType(): "tampermonkey" | "localStorage" {
        return this.storageType;
    }
}

export function extensionPersisted<T>(key: string, initialValue: T): ExtensionPersistedStore<T> {
    const store = writable<T>(initialValue);
    const storage = new StorageAdapter();
    let isInitialized = false;

    // Log storage type for debugging
    console.log(`ExtensionPersistedStore[${key}]: Using storage type: ${storage.getStorageType()}`);

    // Initialize store with value from storage
    const initializeStore = async () => {
        if (isInitialized) return;

        try {
            const storedValue = await storage.getItem(key);
            if (storedValue !== null) {
                const parsedValue = JSON.parse(storedValue);
                store.set(parsedValue);
                console.log(`ExtensionPersistedStore[${key}]: Loaded from storage:`, parsedValue);
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
            await storage.setItem(key, JSON.stringify(value));
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
                await storage.removeItem(key);
                store.set(initialValue);
            } catch (error) {
                console.error(`Failed to reset persisted store for key "${key}":`, error);
            }
        },
    };
}

// Helper function to migrate from regular localStorage to extension storage
export async function migrateFromLocalStorage(key: string): Promise<string | null> {
    try {
        // Check if we have data in regular localStorage
        const localStorageValue = localStorage.getItem(key);
        if (localStorageValue !== null) {
            // Migrate to extension storage
            await extensionStorage.setItem(key, localStorageValue);
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
