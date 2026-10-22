class TakoThread {
    private labelNames: Set<string>;
    private location: ThreadLocation | null = null;
    constructor(readonly app: TakoApp, readonly thread: GoogleAppsScript.Gmail.GmailThread) {
        this.labelNames = new Set(this.thread.getLabels().map(label => labelKey(label.getName())));
    }

    private runIfNotHasLabelsAny(labels: LabelName[] = [], action: () => void): void {
        if (labels.length === 0 || !this.hasLabelsAny(labels)) {
            action();
        }
    }

    private getLocation(): ThreadLocation {
        if (this.location === null) {
            if (this.thread.isInTrash()) {
                this.location = ThreadLocation.Trash;
            } else if (this.thread.isInInbox()) {
                this.location = ThreadLocation.Inbox;
            } else {
                this.location = ThreadLocation.Archive;
            }
        }
        return this.location;
    }

    private moveTo(location: ThreadLocation, options: MoveActionOptions): TakoThread {
        this.runIfNotHasLabelsAny(options.ifNotHasLabelsAny, () => {
            if (this.getLocation() === location) {
                return;
            }
            switch (location) {
                case ThreadLocation.Inbox:
                    this.thread.moveToInbox();
                    break;
                case ThreadLocation.Archive:
                    this.thread.moveToArchive();
                    break;
                case ThreadLocation.Trash:
                    this.thread.moveToTrash();
                    break;
            }
            this.location = location;
        });
        return this;
    }

    getSubject(): string {
        return this.thread.getFirstMessageSubject();
    }

    getMessages(): TakoMessage[] {
        return this.thread.getMessages().map(message => new TakoMessage(this, message));
    }

    hasLabel(labelName: LabelName): boolean {
        return this.labelNames.has(labelKey(labelName));
    }

    hasLabelsAny(labelNames: LabelName[]): boolean {
        return labelNames.some(labelName => this.hasLabel(labelName));
    }

    addLabel(labelName: LabelName): TakoThread {
        if (!this.hasLabel(labelName)) {
            this.thread.addLabel(this.app.getLabelByName(labelName));
            this.labelNames.add(labelKey(labelName));
        }
        return this;
    }

    removeLabel(labelName: LabelName): TakoThread {
        if (this.hasLabel(labelName)) {
            this.thread.removeLabel(this.app.getLabelByName(labelName));
            this.labelNames.delete(labelKey(labelName));
        }
        return this;
    }

    moveToArchive(options: MoveActionOptions = {}): TakoThread {
        return this.moveTo(ThreadLocation.Archive, options);
    }

    moveToInbox(options: MoveActionOptions = {}): TakoThread {
        return this.moveTo(ThreadLocation.Inbox, options);
    }

    moveToTrash(options: MoveActionOptions = {}): TakoThread {
        return this.moveTo(ThreadLocation.Trash, options);
    }
}
