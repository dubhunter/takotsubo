class TakoApp {
    private userProperties: GoogleAppsScript.Properties.Properties;
    private labels = new Map<string, GoogleAppsScript.Gmail.GmailLabel>();

    constructor() {
        this.userProperties = PropertiesService.getUserProperties();
        for (const label of GmailApp.getUserLabels()) {
            this.labels.set(labelKey(label.getName()), label);
        }
    }

    private log(message: string): void {
        console.info(message);
    }

    private setLastMessage(message: TakoMessage): void {
        const messageId = message.getId();
        if (messageId !== this.getLastMessageId()) {
            this.userProperties.setProperty(UserProp.LastMessageId, messageId);
        }
        const messageTime = message.getTimestamp();
        if (messageTime > this.getLastMessageTime()) {
            this.userProperties.setProperty(UserProp.LastMessageTimestamp, messageTime.toString());
        }
    }

    private getLastMessageTime(): number {
        return Number(this.userProperties.getProperty(UserProp.LastMessageTimestamp) || 0);
    }

    private getLastMessageId(): string | null {
        return this.userProperties.getProperty(UserProp.LastMessageId);
    }

    private createLabel(labelName: string): void {
        this.labels.set(labelKey(labelName), GmailApp.createLabel(labelName));
    }

    private search(query: string): GoogleAppsScript.Gmail.GmailThread[] {
        this.log(`Searching: ${query}`);
        return GmailApp.search(query);
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
        const lastMessageId = this.getLastMessageId();
        const query = `label:GH after:${this.getLastMessageTime() + 1}`;
        const threads = this.search(query);
        const count = threads.length;
        this.log(`Found ${count} threads`);
        for (const [i, gmailThread] of threads.entries()) {
            const thread = new TakoThread(this, gmailThread);
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
        return this;
    }
}
