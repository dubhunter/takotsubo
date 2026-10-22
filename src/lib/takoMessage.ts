class TakoMessage {
    constructor(readonly thread: TakoThread, readonly message: GoogleAppsScript.Gmail.GmailMessage) {}

    getId(): string {
        return this.message.getId();
    }

    getTimestamp(): number {
        return Math.floor(this.message.getDate().getTime() / 1000);
    }

    hasLabel(labelName: LabelName): boolean {
        return this.thread.hasLabel(labelName);
    }

    hasLabelsAny(labelNames: LabelName[]): boolean {
        return this.thread.hasLabelsAny(labelNames);
    }

    addLabel(labelName: LabelName): TakoMessage {
        this.thread.addLabel(labelName);
        return this;
    }

    removeLabel(labelName: LabelName): TakoMessage {
        this.thread.removeLabel(labelName);
        return this;
    }

    moveToArchive(options: MoveActionOptions = {}): TakoMessage {
        this.thread.moveToArchive(options);
        return this;
    }

    moveToInbox(options: MoveActionOptions = {}): TakoMessage {
        this.thread.moveToInbox(options);
        return this;
    }

    moveToTrash(options: MoveActionOptions = {}): TakoMessage {
        this.thread.moveToTrash(options);
        return this;
    }

    fromContains(search: RegExp | string) {
        return stringContains(this.message.getFrom(), search);
    }

    ccContains(search: RegExp | string) {
        return stringContains(this.message.getCc(), search);
    }

    subjectContains(search: RegExp | string) {
        return stringContains(this.message.getSubject(), search);
    }

    bodyContains(search: RegExp | string) {
        return stringContains(this.message.getPlainBody(), search);
    }
}
