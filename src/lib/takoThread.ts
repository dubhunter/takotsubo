class TakoThread {
    protected labelNames: Set<string>;
    constructor(readonly app: TakoApp, readonly thread: GoogleAppsScript.Gmail.GmailThread) {
        this.labelNames = new Set(this.thread.getLabels().map(label => label.getName()));
    }

    protected runIfNotHasLabelsAny(labels: LabelName[], action: () => void): void {
        if (labels.length === 0 || !this.hasLabelsAny(labels)) {
            action();
        }
    }

    getSubject(): string {
        return this.thread.getFirstMessageSubject();
    }

    getMessages(): TakoMessage[] {
        return this.thread.getMessages().map(message => new TakoMessage(this, message));
    }

    hasLabel(labelName: LabelName): boolean {
        return this.labelNames.has(labelName);
    }

    hasLabelsAny(labelNames: LabelName[]): boolean {
        return labelNames.some(labelName => this.hasLabel(labelName));
    }

    addLabel(labelName: LabelName): TakoThread {
        if (!this.labelNames.has(labelName)) {
            this.thread.addLabel(this.app.getLabelByName(labelName));
            this.labelNames.add(labelName);
        }
        return this;
    }

    removeLabel(labelName: LabelName): TakoThread {
        if (this.labelNames.has(labelName)) {
            this.thread.removeLabel(this.app.getLabelByName(labelName));
            this.labelNames.delete(labelName);
        }
        return this;
    }

    moveToArchive(options: MoveActionOptions = {ifNotHasLabelsAny: []}): TakoThread {
        this.runIfNotHasLabelsAny(options.ifNotHasLabelsAny, () => this.thread.moveToArchive());
        return this;
    }

    moveToInbox(options: MoveActionOptions = {ifNotHasLabelsAny: []}): TakoThread {
        this.runIfNotHasLabelsAny(options.ifNotHasLabelsAny, () => this.thread.moveToInbox());
        return this;
    }

    moveToTrash(options: MoveActionOptions = {ifNotHasLabelsAny: []}): TakoThread {
        this.runIfNotHasLabelsAny(options.ifNotHasLabelsAny, () => this.thread.moveToTrash());
        return this;
    }
}
