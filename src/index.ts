function run() {
    withScriptLock(() => {
        const app = new TakoApp();
        app.processNewMessages();
    });
}

function debug() {
    withScriptLock(() => {
        const app = new TakoApp();
        app.resetProperties();
        app.processNewMessages();
    });
}

function ensureLabels() {
    const app = new TakoApp();
    app.ensureLabels();
}

function listFilters() {
    const app = new TakoApp();
    app.listFilters();
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
