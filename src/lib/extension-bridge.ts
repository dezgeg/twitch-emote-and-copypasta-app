// Extension bridge for handling localStorage with Tampermonkey storage fallback
// This provides a unified localStorage API that automatically uses Tampermonkey storage when available

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

class ExtensionStorage {
    async getItem(key: string): Promise<string | null> {
        if (window.TampermonkeyStorage) {
            return window.TampermonkeyStorage.getValue(key, null);
        }
        return localStorage.getItem(key);
    }

    async setItem(key: string, value: string): Promise<void> {
        if (window.TampermonkeyStorage) {
            window.TampermonkeyStorage.setValue(key, value);
        } else {
            localStorage.setItem(key, value);
        }
    }

    async removeItem(key: string): Promise<void> {
        if (window.TampermonkeyStorage) {
            window.TampermonkeyStorage.deleteValue(key);
        } else {
            localStorage.removeItem(key);
        }
    }

    async clear(): Promise<void> {
        if (window.TampermonkeyStorage) {
            const keys = window.TampermonkeyStorage.listValues();
            keys.forEach((k) => window.TampermonkeyStorage!.deleteValue(k));
        } else {
            localStorage.clear();
        }
    }

    async key(index: number): Promise<string | null> {
        if (window.TampermonkeyStorage) {
            const keys = window.TampermonkeyStorage.listValues();
            return keys[index] || null;
        }
        return localStorage.key(index);
    }

    async length(): Promise<number> {
        if (window.TampermonkeyStorage) {
            return window.TampermonkeyStorage.listValues().length;
        }
        return localStorage.length;
    }

    // Add value change listener (only works with Tampermonkey)
    addValueChangeListener(
        key: string,
        callback: (key: string, oldValue: any, newValue: any, remote: boolean) => void,
    ): string | null {
        if (window.TampermonkeyStorage?.addValueChangeListener) {
            return window.TampermonkeyStorage.addValueChangeListener(key, callback);
        }
        console.warn("Value change listeners are only available with Tampermonkey");
        return null;
    }
}

// Create singleton instance
export const extensionStorage = new ExtensionStorage();

// Helper function to detect if we're in an iframe context
export function isInIframe(): boolean {
    return window.self !== window.top;
}

// Helper function to detect if Tampermonkey is available
export function hasTampermonkey(): boolean {
    return typeof window.TampermonkeyStorage !== "undefined";
}

// Helper function to determine storage type
export function getStorageType(): "tampermonkey" | "localStorage" {
    if (hasTampermonkey()) return "tampermonkey";
    return "localStorage";
}
