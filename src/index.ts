function dryRun() {
    const app = new TakoApp(true);
    app.processNewMessages();
}

function run() {
    util.withScriptLock(() => {
        const app = new TakoApp();
        app.processNewMessages();
    });
}

function debug() {
    util.withScriptLock(() => {
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
