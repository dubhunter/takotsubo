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
