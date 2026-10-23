// A stateful fake of GmailApp: user labels, threads, messages, inbox/archive/trash, and enough of search for
// label:, after: and in: queries. Behavior marked "measured" was checked in real GAS; the rest is a best guess.

export type FakeLocation = 'inbox' | 'archive' | 'trash';

export type FakeMessageInit = {
    id?: string;
    // The Date header, returned by getDate().
    date: Date;
    // When Gmail received it, used by search. Measured: 0 to 2 seconds after the Date header. Defaults to date.
    receivedAt?: Date;
    from?: string;
    cc?: string;
    subject?: string;
    body?: string;
};

export type FakeThreadInit = {
    id?: string;
    labels?: string[];
    location?: FakeLocation;
    messages: FakeMessageInit[];
};

// Gmail label names are case-insensitive, and search writes spaces and slashes as dashes (label:gh-direct-review).
function labelKey(name: string): string {
    return name.toLowerCase().replace(/[\s/]+/g, '-');
}

let nextId = 1;

export class FakeGmailLabel {
    private name: string;

    constructor(name: string) {
        this.name = name;
    }

    getName(): string {
        return this.name;
    }
}

export class FakeGmailMessage {
    readonly id: string;
    readonly date: Date;
    readonly receivedAt: Date;
    readonly from: string;
    readonly cc: string;
    readonly subject: string;
    readonly body: string;

    constructor(init: FakeMessageInit) {
        this.id = init.id ?? `message-${nextId++}`;
        this.date = init.date;
        this.receivedAt = init.receivedAt ?? init.date;
        this.from = init.from ?? '';
        this.cc = init.cc ?? '';
        this.subject = init.subject ?? '';
        this.body = init.body ?? '';
    }

    getId(): string {
        return this.id;
    }

    getDate(): Date {
        return this.date;
    }

    getFrom(): string {
        return this.from;
    }

    getCc(): string {
        return this.cc;
    }

    getSubject(): string {
        return this.subject;
    }

    getPlainBody(): string {
        return this.body;
    }
}

export class FakeGmailThread {
    readonly id: string;
    location: FakeLocation;
    private gmail: FakeGmailApp;
    private labels = new Set<FakeGmailLabel>();
    private messages: FakeGmailMessage[] = [];

    constructor(gmail: FakeGmailApp, init: FakeThreadInit) {
        this.gmail = gmail;
        this.id = init.id ?? `thread-${nextId++}`;
        this.location = init.location ?? 'inbox';
        (init.labels ?? []).forEach(name => this.labels.add(gmail.label(name)));
        init.messages.forEach(message => this.addMessage(message));
    }

    // Test helper: new mail arriving on this thread.
    addMessage(init: FakeMessageInit): FakeGmailMessage {
        const message = new FakeGmailMessage(init);
        this.messages.push(message);
        return message;
    }

    // Test helper: label names, sorted.
    labelNames(): string[] {
        return [...this.labels].map(label => label.getName()).sort();
    }

    hasLabel(name: string): boolean {
        return [...this.labels].some(label => labelKey(label.getName()) === labelKey(name));
    }

    // For search; uses the messages directly so tests can wrap getMessages() without search calling it.
    someMessage(test: (message: FakeGmailMessage) => boolean): boolean {
        return this.messages.some(test);
    }

    lastReceivedAt(): number {
        return Math.max(...this.messages.map(message => message.receivedAt.getTime()));
    }

    getId(): string {
        return this.id;
    }

    getFirstMessageSubject(): string {
        return this.messages[0]?.subject ?? '';
    }

    getMessages(): FakeGmailMessage[] {
        return [...this.messages];
    }

    getMessageCount(): number {
        return this.messages.length;
    }

    getLastMessageDate(): Date {
        return new Date(Math.max(...this.messages.map(message => message.date.getTime())));
    }

    getLabels(): FakeGmailLabel[] {
        return [...this.labels];
    }

    // Writes are recorded even when they change nothing, since real GAS charges for them (measured: about 420 ms).
    addLabel(label: FakeGmailLabel): FakeGmailThread {
        this.gmail.writes.push(`${this.id} +${label.getName()}`);
        this.labels.add(label);
        return this;
    }

    removeLabel(label: FakeGmailLabel): FakeGmailThread {
        this.gmail.writes.push(`${this.id} -${label.getName()}`);
        this.labels.delete(label);
        return this;
    }

    isInInbox(): boolean {
        return this.location === 'inbox';
    }

    isInTrash(): boolean {
        return this.location === 'trash';
    }

    // Measured: also takes a thread out of the trash.
    moveToInbox(): FakeGmailThread {
        return this.moveTo('inbox');
    }

    moveToArchive(): FakeGmailThread {
        return this.moveTo('archive');
    }

    moveToTrash(): FakeGmailThread {
        return this.moveTo('trash');
    }

    private moveTo(location: FakeLocation): FakeGmailThread {
        this.gmail.writes.push(`${this.id} → ${location}`);
        this.location = location;
        return this;
    }
}

type SearchTerm = (thread: FakeGmailThread, message: FakeGmailMessage) => boolean;

export class FakeGmailApp {
    threads: FakeGmailThread[] = [];
    // Every label, move and create call, for checking that no-op writes are skipped.
    writes: string[] = [];
    queries: string[] = [];
    private labels = new Map<string, FakeGmailLabel>();

    // Test helper: gets or creates a user label without recording a write.
    label(name: string): FakeGmailLabel {
        if (!this.labels.has(labelKey(name))) {
            this.labels.set(labelKey(name), new FakeGmailLabel(name));
        }
        return this.labels.get(labelKey(name));
    }

    // Test helper: a thread as it exists before the script runs.
    addThread(init: FakeThreadInit): FakeGmailThread {
        const thread = new FakeGmailThread(this, init);
        this.threads.push(thread);
        return thread;
    }

    createLabel(name: string): FakeGmailLabel {
        this.writes.push(`create ${name}`);
        return this.label(name);
    }

    getUserLabels(): FakeGmailLabel[] {
        return [...this.labels.values()];
    }

    getUserLabelByName(name: string): FakeGmailLabel | null {
        return this.labels.get(labelKey(name)) ?? null;
    }

    // Newest first by last message. Measured: matches per message, not per thread, so a thread matches when any one
    // message matches every term. Threads in the trash are skipped unless the query has in:trash.
    search(query: string, start = 0, max = 500): FakeGmailThread[] {
        // Measured error message.
        if (max > 500) {
            throw new Error('Argument max cannot exceed 500.');
        }
        this.queries.push(query);
        const terms = query.trim().split(/\s+/).map(parseTerm);
        const includeTrash = /(^|\s)in:trash(\s|$)/.test(query);
        return this.threads
            .filter(thread => includeTrash || thread.location !== 'trash')
            .filter(thread => thread.someMessage(message => terms.every(term => term(thread, message))))
            .sort((a, b) => b.lastReceivedAt() - a.lastReceivedAt())
            .slice(start, start + max);
    }
}

function parseTerm(term: string): SearchTerm {
    const [, key, value] = term.match(/^(\w+):(.+)$/) ?? [];
    switch (key) {
        case 'label':
            return thread => thread.hasLabel(value);
        case 'after': {
            // Measured: after:N includes second N, and after:0 matches nothing.
            const seconds = Number(value);
            return (_thread, message) => seconds > 0 && Math.floor(message.receivedAt.getTime() / 1000) >= seconds;
        }
        case 'in':
            if (value === 'inbox' || value === 'trash') {
                return thread => thread.location === value;
            }
    }
    throw new Error(`Not implemented: search term "${term}"`);
}
