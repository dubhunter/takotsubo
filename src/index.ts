function run() {
    app.processNewMessages();
}

function debug() {
    app.resetProperties();
    app.processNewMessages();
}

function ensureLabels() {
    app.ensureLabels();
}

function listFilters() {
    app.listFilters();
}
