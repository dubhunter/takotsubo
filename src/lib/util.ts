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
    for (;;) {
        const page = fetchPage(items.length, pageSize);
        if (page.length === 0) {
            return items;
        }
        items.push(...page);
    }
}
