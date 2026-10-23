import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

export type GasProject = {
    // Reads a top-level declaration by name. Classes and consts are not properties of the global object, so this is the only way to reach them.
    get<T>(name: string): T;
    // Fixes Date.now() inside the project, or pass null for the real clock. new Date() is not affected.
    setNow(ms: number | null): void;
};

// Runs a built Apps Script project the way GAS does: every .js file in one shared global scope, in push order.
// Each call gets a fresh context, so tests cannot leak into each other.
export function loadGas(rootDir: string, globals: Record<string, unknown>): GasProject {
    const context = vm.createContext({...globals});
    let now: number | null = null;
    const contextDate = vm.runInContext('Date', context) as DateConstructor;
    const realNow = contextDate.now;
    contextDate.now = () => now ?? realNow();

    for (const file of pushOrder(rootDir)) {
        vm.runInContext(fs.readFileSync(file, 'utf8'), context, {filename: file});
    }

    return {
        get: <T,>(name: string) => vm.runInContext(name, context) as T,
        setNow: ms => {
            now = ms;
        },
    };
}

// Alphabetical by path, which is believed to be clasp's order (unverified). .clasp.json's filePushOrder is not supported yet.
function pushOrder(rootDir: string): string[] {
    return fs.readdirSync(rootDir, {recursive: true, encoding: 'utf8'})
        .filter(file => file.endsWith('.js'))
        .sort()
        .map(file => path.join(rootDir, file));
}
