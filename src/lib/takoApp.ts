// GmailApp.search throws above 500.
const SEARCH_PAGE_SIZE = 500;

// GAS kills a run at about 6 minutes; stop between threads before that.
const RUN_DEADLINE_MS = 5 * 60 * 1000;

// How long to remember processed messages. Search can find a thread again a few seconds after the cursor passes it.
const RECENT_MESSAGE_WINDOW_S = 5 * 60;

class TakoApp {
    private userProperties: GoogleAppsScript.Properties.Properties;
    private labels = new Map<string, GoogleAppsScript.Gmail.GmailLabel>();
    private deadline = Date.now() + RUN_DEADLINE_MS;
    private timeZone: string;

    // Dry run: evaluate every rule and log what would happen, but write nothing to Gmail or user properties.
    constructor(readonly dryRun = false) {
        this.userProperties = PropertiesService.getUserProperties();
        this.timeZone = Session.getScriptTimeZone();
        for (const label of GmailApp.getUserLabels()) {
            this.labels.set(util.labelKey(label.getName()), label);
        }
    }

    private log(message: string): void {
        console.info(message);
    }

    private logAction(index: number, message: TakoMessage, filterName: string, effects: string[]): void {
        const date = Utilities.formatDate(message.getDate(), this.timeZone, 'MMM d HH:mm');
        this.log(`  #${index + 1} ${date} ${filterName}: ${util.formatList(effects, 'no actions')}`);
    }

    private logNetChanges(changes: string[]): void {
        this.log(`  net: ${util.formatList(changes, 'no change')}`);
    }

    // Namespaced by filter set, for example GitHub.lastMessageTimestamp.
    private propertyKey(filterSet: FilterSet, prop: UserProp): string {
        return `${filterSet.name}.${prop}`;
    }

    // Starts at 1, not 0: Gmail search matches nothing for after:0.
    private loadCursor(filterSet: FilterSet): number {
        if (this.dryRun) {
            return 1;
        }
        return Math.floor(Number(this.userProperties.getProperty(this.propertyKey(filterSet, UserProp.LastMessageTimestamp)) || 1));
    }

    private saveCursor(filterSet: FilterSet, cursor: number): void {
        if (this.dryRun) {
            return;
        }
        this.userProperties.setProperty(this.propertyKey(filterSet, UserProp.LastMessageTimestamp), cursor.toString());
    }

    private loadRecentMessageIds(filterSet: FilterSet): Map<string, number> {
        if (this.dryRun) {
            return new Map();
        }
        return new Map(Object.entries(JSON.parse(this.userProperties.getProperty(this.propertyKey(filterSet, UserProp.RecentMessageIds)) || '{}')));
    }

    private saveRecentMessageIds(filterSet: FilterSet, ids: Map<string, number>): void {
        if (this.dryRun) {
            return;
        }
        this.userProperties.setProperty(this.propertyKey(filterSet, UserProp.RecentMessageIds), JSON.stringify(Object.fromEntries(ids)));
    }

    private advanceCursor(filterSet: FilterSet, message: TakoMessage, cursor: number, recentMessageIds: Map<string, number>): number {
        // Capped at now in case a sender's clock runs fast, since the cursor never moves backward.
        const messageTime = Math.min(message.getTimestamp(), Math.floor(Date.now() / 1000));
        const newCursor = Math.max(cursor, messageTime);

        recentMessageIds.set(message.getId(), messageTime);
        for (const [id, time] of recentMessageIds) {
            if (time < newCursor - RECENT_MESSAGE_WINDOW_S) {
                recentMessageIds.delete(id);
            }
        }

        // Ids first: if the run dies between the writes, the thread is found again and skipped.
        this.saveRecentMessageIds(filterSet, recentMessageIds);
        if (newCursor > cursor) {
            this.saveCursor(filterSet, newCursor);
        }
        return newCursor;
    }

    private createLabel(labelName: string): void {
        this.labels.set(util.labelKey(labelName), GmailApp.createLabel(labelName));
    }

    private search(query: string): GoogleAppsScript.Gmail.GmailThread[] {
        this.log(`Searching: ${query}`);
        return util.fetchAllPages((start, max) => GmailApp.search(query, start, max), SEARCH_PAGE_SIZE).reverse();
    }

    private processFilterSet(filterSet: FilterSet): void {
        this.log(`Filter set: ${filterSet.name}`);
        let cursor = this.loadCursor(filterSet);
        const recentMessageIds = this.loadRecentMessageIds(filterSet);

        // after: includes the cursor's own second, so nothing in it is missed; threads already processed are skipped below.
        const query = `${filterSet.query} after:${cursor}`;
        const threads = this.search(query);
        const count = threads.length;
        this.log(`Found ${count} threads`);

        const ruleMatches = new Map<string, number>();
        const netChanges = new Map<string, number>();
        let processed = 0;
        for (const [i, gmailThread] of threads.entries()) {
            if (Date.now() > this.deadline) {
                this.log(`Deadline reached after ${i}/${count} threads, resuming next run.`);
                break;
            }

            const thread = new TakoThread(this, gmailThread);
            const messages = thread.getMessages();
            const newest = messages[messages.length - 1];
            // Replay only on a new message, so a thread archived by hand stays archived.
            if (recentMessageIds.has(newest.getId())) {
                this.log(`Skipping thread ${i + 1}/${count}, no new messages: ${thread.getSubject()}`);
                continue;
            }

            // Replay the whole thread oldest first: labels set by earlier messages are state for later ones.
            this.log(`Thread ${i + 1}/${count}: ${thread.getSubject()} (${messages.length} messages)`);
            for (const [n, message] of messages.entries()) {
                for (const filter of filterSet.filters) {
                    if (filter.rule(message)) {
                        filter.action(message);
                        util.countUp(ruleMatches, filter.name);
                        this.logAction(n, message, filter.name, thread.takeEffects());
                        if (filter.lastFilter) {
                            break;
                        }
                    }
                }
            }

            const changes = thread.getNetChanges();
            this.logNetChanges(changes);
            changes.forEach(change => util.countUp(netChanges, change));
            processed++;
            cursor = this.advanceCursor(filterSet, newest, cursor, recentMessageIds);
        }

        this.log(`Done: processed ${processed}/${count} threads.`);
        this.log(`Rule matches (messages): ${util.formatCounts(ruleMatches)}`);
        this.log(`Net changes (threads): ${util.formatCounts(netChanges)}`);
    }

    getLabelByName(labelName: LabelName): GoogleAppsScript.Gmail.GmailLabel {
        if (!this.labels.has(util.labelKey(labelName))) {
            this.createLabel(labelName);
        }
        return this.labels.get(util.labelKey(labelName));
    }

    ensureLabels(): TakoApp {
        this.log('Ensure labels...');
        for (const labelName of Object.values(LabelName)) {
            if (!this.labels.has(util.labelKey(labelName))) {
                if (this.dryRun) {
                    this.log(`Would create label: ${labelName}`);
                    continue;
                }
                this.log(`Creating label: ${labelName}`);
                this.createLabel(labelName);
            }
        }
        return this;
    }

    resetProperties(): TakoApp {
        this.userProperties.deleteAllProperties();
        this.log('User properties deleted.');
        return this;
    }

    listFilters(): TakoApp {
        for (const filterSet of filterSets) {
            this.log(`Filter set: ${filterSet.name} (${filterSet.query})`);
            for (const filter of filterSet.filters) {
                this.log(`  Filter: ${filter.name}`);
            }
        }
        return this;
    }

    processNewMessages(): TakoApp {
        if (this.dryRun) {
            this.log('Dry run: nothing will be changed in Gmail.');
        }
        this.ensureLabels();
        for (const filterSet of filterSets) {
            this.processFilterSet(filterSet);
        }
        return this;
    }
}
