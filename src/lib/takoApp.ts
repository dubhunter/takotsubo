// GmailApp.search throws above 500.
const SEARCH_PAGE_SIZE = 500;
// GAS kills a run at about 6 minutes; stop between threads before that.
const RUN_DEADLINE_MS = 5 * 60 * 1000;

class TakoApp {
    private userProperties: GoogleAppsScript.Properties.Properties;
    private labels = new Map<string, GoogleAppsScript.Gmail.GmailLabel>();
    private deadline = Date.now() + RUN_DEADLINE_MS;

    constructor() {
        this.userProperties = PropertiesService.getUserProperties();
        for (const label of GmailApp.getUserLabels()) {
            this.labels.set(labelKey(label.getName()), label);
        }
    }

    private log(message: string): void {
        console.info(message);
    }

    private setLastMessageTime(time: number): void {
        this.userProperties.setProperty(UserProp.LastMessageTimestamp, time.toString());
    }

    private getLastMessageTime(): number {
        return Math.floor(Number(this.userProperties.getProperty(UserProp.LastMessageTimestamp) || 0));
    }

    private createLabel(labelName: string): void {
        this.labels.set(labelKey(labelName), GmailApp.createLabel(labelName));
    }

    // Oldest first: search returns threads newest first by last message.
    private search(query: string): GoogleAppsScript.Gmail.GmailThread[] {
        this.log(`Searching: ${query}`);
        return fetchAllPages((start, max) => GmailApp.search(query, start, max), SEARCH_PAGE_SIZE).reverse();
    }

    getLabelByName(labelName: LabelName): GoogleAppsScript.Gmail.GmailLabel {
        if (!this.labels.has(labelKey(labelName))) {
            this.createLabel(labelName);
        }
        return this.labels.get(labelKey(labelName));
    }

    ensureLabels(): TakoApp {
        this.log('Ensure labels...');
        for (const labelName of Object.values(LabelName)) {
            if (!this.labels.has(labelKey(labelName))) {
                this.log(`Creating label: ${labelName}`);
                this.createLabel(labelName);
            }
        }
        return this;
    }

    listFilters(): TakoApp {
        for (const filter of gmailFilters) {
            this.log(`Filter: ${filter.name}`);
        }
        return this;
    }

    resetProperties(): TakoApp {
        this.userProperties.deleteAllProperties();
        this.log('User properties deleted.');
        return this;
    }

    processNewMessages(): TakoApp {
        this.ensureLabels();
        let cursor = this.getLastMessageTime();
        // after: includes the cursor's own second, so a thread ending in it is replayed rather than missed.
        const query = `label:GH after:${cursor}`;
        const threads = this.search(query);
        const count = threads.length;
        this.log(`Found ${count} threads`);
        for (const [i, gmailThread] of threads.entries()) {
            if (Date.now() > this.deadline) {
                this.log(`Deadline reached after ${i}/${count} threads, resuming next run.`);
                break;
            }
            const thread = new TakoThread(this, gmailThread);
            this.log(`Processing thread ${i + 1}/${count}: ${thread.getSubject()}`);
            const messages = thread.getMessages();
            for (const message of messages) {
                for (const filter of gmailFilters) {
                    if (filter.rule(message)) {
                        this.log(`Running action for filter: ${filter.name}`);
                        filter.action(message);
                        if (filter.lastFilter) {
                            break
                        }
                    }
                }
            }
            // Capped at now in case a sender's clock runs fast, since the cursor never moves backward.
            const threadTime = Math.min(thread.getLastMessageTime(), Math.floor(Date.now() / 1000));
            if (threadTime > cursor) {
                cursor = threadTime;
                this.setLastMessageTime(cursor);
            }
        }
        this.log('Done!');
        return this;
    }
}
