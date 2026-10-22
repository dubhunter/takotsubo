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

// Evaluates every rule over all GH mail and logs what would happen. Changes nothing.
function dryRun() {
    const app = new TakoApp(true);
    app.processNewMessages();
}

function ensureLabels() {
    const app = new TakoApp();
    app.ensureLabels();
}

function listFilters() {
    const app = new TakoApp();
    app.listFilters();
}
