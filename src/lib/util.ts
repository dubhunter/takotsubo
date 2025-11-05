function stringContains(str: string, search: RegExp | string): boolean {
    if (search instanceof RegExp) {
        return search.test(str);
    }
    return str.includes(search);
}
