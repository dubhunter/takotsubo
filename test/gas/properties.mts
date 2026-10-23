// Documented limit: 9 KB per value.
const MAX_VALUE_BYTES = 9 * 1024;

export class FakeProperties {
    private values = new Map<string, string>();

    getProperty(key: string): string | null {
        return this.values.get(key) ?? null;
    }

    setProperty(key: string, value: string): FakeProperties {
        if (Buffer.byteLength(value) > MAX_VALUE_BYTES) {
            throw new Error(`Property ${key} is over the 9 KB value limit.`);
        }
        this.values.set(key, String(value));
        return this;
    }

    deleteProperty(key: string): FakeProperties {
        this.values.delete(key);
        return this;
    }

    deleteAllProperties(): FakeProperties {
        this.values.clear();
        return this;
    }

    getKeys(): string[] {
        return [...this.values.keys()];
    }

    getProperties(): Record<string, string> {
        return Object.fromEntries(this.values);
    }
}

export class FakePropertiesService {
    user = new FakeProperties();
    script = new FakeProperties();
    document = new FakeProperties();

    getUserProperties(): FakeProperties {
        return this.user;
    }

    getScriptProperties(): FakeProperties {
        return this.script;
    }

    getDocumentProperties(): FakeProperties {
        return this.document;
    }
}
