class TakoApp {
    protected userProperties: GoogleAppsScript.Properties.Properties;
    protected labels = new Map<string, GoogleAppsScript.Gmail.GmailLabel>();

    constructor() {
        this.userProperties = PropertiesService.getUserProperties();
        for (const label of GmailApp.getUserLabels()) {
            this.labels.set(label.getName(), label);
        }
    }

    protected log(message: string): void {
        console.info(message);
    }

    protected setLastMessage(message: TakoMessage): void {
        const messageId = message.getId();
        if (messageId !== this.getLastMessageId()) {
            this.userProperties.setProperty(UserProp.LastMessageId, messageId);
        }
        const messageTime = message.getTimestamp();
        if (messageTime > this.getLastMessageTime()) {
            this.userProperties.setProperty(UserProp.LastMessageTimestamp, messageTime.toString());
        }
    }

    protected getLastMessageTime(): number {
        return Number(this.userProperties.getProperty(UserProp.LastMessageTimestamp) || 0);
    }

    protected getLastMessageId(): string | null {
        return this.userProperties.getProperty(UserProp.LastMessageId);
    }

    protected createLabel(labelName: string): void {
        this.labels.set(labelName, GmailApp.createLabel(labelName));
    }

    protected search(query: string): TakoThread[] {
        this.log(`Searching: ${query}`);
        return GmailApp.search(query).map(thread => new TakoThread(this, thread));
    }

    getLabelByName(labelName: LabelName): GoogleAppsScript.Gmail.GmailLabel {
        if (!this.labels.has(labelName)) {
            this.createLabel(labelName);
        }
        return this.labels.get(labelName);
    }

    ensureLabels(): void {
        this.log('Ensure labels...');
        for (const labelName of Object.values(LabelName)) {
            if (!this.labels.has(labelName)) {
                this.log(`Creating label: ${labelName}`);
                this.createLabel(labelName);
            }
        }
    }

    listFilters(): void {
        for (const filter of gmailFilters) {
            this.log(`Filter: ${filter.name}`);
        }
    }

    resetProperties(): void {
        this.userProperties.deleteAllProperties();
        this.log('User properties deleted.');
    }

    processNewMessages(): void {
        this.ensureLabels();
        const lastMessageId = this.getLastMessageId();
        const query = `label:GH after:${this.getLastMessageTime() + 1}`;
        this.log(`Searching: ${query}`);
        const threads = this.search(query);
        const count = threads.length;
        this.log(`Found ${count} threads`);
        for (const [i, thread] of threads.entries()) {
            this.log(`Processing thread ${i + 1}/${count}: ${thread.getSubject()}`);
            const messages = thread.getMessages();
            for (const message of messages) {
                if (message.getId() === lastMessageId) {
                    continue;
                }
                for (const filter of gmailFilters) {
                    if (filter.rule(message)) {
                        this.log(`Running action for filter: ${filter.name}`);
                        filter.action(message);
                        if (filter.lastFilter) {
                            break
                        }
                    }
                }
                this.setLastMessage(message);
            }
        }
        this.log('Done!');
    }
}
