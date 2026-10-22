function stringContains(str: string, search: RegExp | string): boolean {
    if (search instanceof RegExp) {
        return search.test(str);
    }
    return str.includes(search);
}

// Gmail label names are case-insensitive, so compare them by this key.
function labelKey(labelName: string): string {
    return labelName.toLowerCase();
}

// Fetches pages until one comes back empty, so a short page can never truncate the results.
function fetchAllPages<T>(fetchPage: (start: number, max: number) => T[], pageSize: number): T[] {
    const items: T[] = [];
    while (true) {
        const page = fetchPage(items.length, pageSize);
        if (page.length === 0) {
            return items;
        }
        items.push(...page);
    }
}

// Time-driven triggers can overlap; skip this tick if another run holds the lock.
function withScriptLock(work: () => void): void {
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(0)) {
        console.info('Another run is in progress, skipping this tick.');
        return;
    }
    try {
        work();
    } finally {
        lock.releaseLock();
    }
}
