// First in the file so it is the editor's default function. Logs what every rule would do and writes nothing.
function dryRun() {
    const app = new TakoApp(true);
    app.processNewMessages();
}

// Called by the time-driven trigger every minute.
function run() {
    util.withScriptLock(() => {
        const app = new TakoApp();
        app.processNewMessages();
    });
}

// Clears every cursor, then replays all threads from the start.
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
