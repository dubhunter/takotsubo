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
