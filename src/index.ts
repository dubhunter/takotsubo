function run() {
    const app = new TakoApp();
    app.processNewMessages();
}

function debug() {
    const app = new TakoApp();
    app.resetProperties();
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
