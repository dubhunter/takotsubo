class TakoMessage {
    constructor(private message: GoogleAppsScript.Gmail.GmailMessage) {}

    getId(): string {
        return this.message.getId();
    }

    getTimestamp(): number {
        return this.message.getDate().getTime() / 1000;
    }

    hasLabel(labelName: LabelName): boolean {
        return this.hasLabelsAny([labelName]);
    }

    hasLabelsAny(labelNames: LabelName[]): boolean {
        for (const label of this.message.getThread().getLabels()) {
            if (labelNames.includes(label.getName() as LabelName)) {
                return true;
            }
        }
        return false;
    }

    addLabel(labelName: string): TakoMessage {
        const label = GmailApp.getUserLabelByName(labelName);
        this.message.getThread().addLabel(label);
        return this;
    }

    removeLabel(labelName: string): TakoMessage {
        const label = GmailApp.getUserLabelByName(labelName);
        this.message.getThread().removeLabel(label);
        return this;
    }

    private runIfNotHasLabelsAny(labels: LabelName[], action: () => void): void {
        if (labels.length === 0 || !this.hasLabelsAny(labels)) {
            action();
        }
    }

    moveToArchive(skipIfHasLabelsAny: LabelName[] = []): TakoMessage {
        this.runIfNotHasLabelsAny(skipIfHasLabelsAny, () => this.message.getThread().moveToArchive());
        return this;
    }

    moveToInbox(skipIfHasLabelsAny: LabelName[] = []): TakoMessage {
        this.runIfNotHasLabelsAny(skipIfHasLabelsAny, () => this.message.getThread().moveToInbox());
        return this;
    }

    moveToTrash(skipIfHasLabelsAny: LabelName[] = []): TakoMessage {
        this.runIfNotHasLabelsAny(skipIfHasLabelsAny, () => this.message.getThread().moveToTrash());
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
