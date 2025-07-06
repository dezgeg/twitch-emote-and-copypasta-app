// Extension bridge for handling localStorage with Tampermonkey storage fallback
// This provides a unified localStorage API that automatically uses Tampermonkey storage when available

// Global interface for Tampermonkey storage exposed to page context
declare global {
    interface Window {
        TampermonkeyStorage?: {
            getItem: (key: string) => any;
            setItem: (key: string, value: any) => void;
            removeItem: (key: string) => void;
            clear: () => void;
            key: (index: number) => string | null;
            length: number;
        };
    }
}

class ExtensionStorage {
    constructor() {
        // No setup needed - we just check for TampermonkeyStorage at runtime
    }

    private async sendRequest(method: string, key?: string, value?: any): Promise<any> {
        // Check if Tampermonkey storage is available (works in both iframe and standalone)
        if (window.TampermonkeyStorage) {
            // Direct synchronous access to Tampermonkey storage
            switch (method) {
                case "getItem":
                    return window.TampermonkeyStorage.getItem(key!);
                case "setItem":
                    window.TampermonkeyStorage.setItem(key!, value);
                    return null;
                case "removeItem":
                    window.TampermonkeyStorage.removeItem(key!);
                    return null;
                case "clear":
                    window.TampermonkeyStorage.clear();
                    return null;
                case "key":
                    return window.TampermonkeyStorage.key(value);
                case "length":
                    return window.TampermonkeyStorage.length;
                default:
                    throw new Error(`Unknown method: ${method}`);
            }
        }

        // Fallback to localStorage when Tampermonkey is not available
        switch (method) {
            case "getItem":
                return localStorage.getItem(key!);
            case "setItem":
                localStorage.setItem(key!, value);
                return null;
            case "removeItem":
                localStorage.removeItem(key!);
                return null;
            case "clear":
                localStorage.clear();
                return null;
            case "key":
                return localStorage.key(value);
            case "length":
                return localStorage.length;
            default:
                throw new Error(`Unknown method: ${method}`);
        }
    }

    async getItem(key: string): Promise<string | null> {
        return await this.sendRequest("getItem", key);
    }

    async setItem(key: string, value: string): Promise<void> {
        await this.sendRequest("setItem", key, value);
    }

    async removeItem(key: string): Promise<void> {
        await this.sendRequest("removeItem", key);
    }

    async clear(): Promise<void> {
        await this.sendRequest("clear");
    }

    async key(index: number): Promise<string | null> {
        return await this.sendRequest("key", undefined, index);
    }

    async length(): Promise<number> {
        return await this.sendRequest("length");
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
