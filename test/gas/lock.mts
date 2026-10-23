// tryLock never waits; set heldElsewhere to simulate another execution holding the lock.
export class FakeLock {
    heldElsewhere = false;
    private held = false;

    tryLock(_timeoutMs: number): boolean {
        if (this.heldElsewhere) {
            return false;
        }
        this.held = true;
        return true;
    }

    hasLock(): boolean {
        return this.held;
    }

    releaseLock(): void {
        this.held = false;
    }
}

export class FakeLockService {
    script = new FakeLock();

    getScriptLock(): FakeLock {
        return this.script;
    }
}
