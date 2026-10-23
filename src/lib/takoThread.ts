class TakoThread {
    // Label key to display name.
    private labelNames: Map<string, string>;
    private initialLabelNames: Map<string, string>;
    private location: ThreadLocation | null = null;
    private initialLocation: ThreadLocation | null = null;
    private effects: string[] = [];
    constructor(readonly app: TakoApp, readonly thread: GoogleAppsScript.Gmail.GmailThread) {
        this.labelNames = new Map(this.thread.getLabels().map(label => [util.labelKey(label.getName()), label.getName()]));
        this.initialLabelNames = new Map(this.labelNames);
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
            this.initialLocation = this.location;
        }
        return this.location;
    }

    private moveTo(location: ThreadLocation, options: MoveActionOptions): TakoThread {
        const blockedBy = (options.ifNotHasLabelsAny ?? []).find(labelName => this.hasLabel(labelName));
        if (blockedBy) {
            this.effects.push(`move to ${location} blocked by ${blockedBy}`);
            return this;
        }

        const from = this.getLocation();
        if (from === location) {
            this.effects.push(`already in ${location}`);
            return this;
        }

        if (!this.app.dryRun) {
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
        }

        this.location = location;
        this.effects.push(`${from} → ${location}`);
        return this;
    }

    getSubject(): string {
        return this.thread.getFirstMessageSubject();
    }

    getMessages(): TakoMessage[] {
        return this.thread.getMessages().map(message => new TakoMessage(this, message));
    }

    // What the actions since the last call did, for logging.
    takeEffects(): string[] {
        const effects = this.effects;
        this.effects = [];
        return effects;
    }

    // Labels added or removed and the move, compared with when the thread was wrapped.
    getNetChanges(): string[] {
        const changes: string[] = [];
        for (const [key, name] of this.labelNames) {
            if (!this.initialLabelNames.has(key)) {
                changes.push(`+${name}`);
            }
        }

        for (const [key, name] of this.initialLabelNames) {
            if (!this.labelNames.has(key)) {
                changes.push(`-${name}`);
            }
        }

        if (this.location !== this.initialLocation) {
            changes.push(`${this.initialLocation} → ${this.location}`);
        }
        return changes;
    }

    hasLabel(labelName: LabelName): boolean {
        return this.labelNames.has(util.labelKey(labelName));
    }

    hasLabelsAny(labelNames: LabelName[]): boolean {
        return labelNames.some(labelName => this.hasLabel(labelName));
    }

    addLabel(labelName: LabelName): TakoThread {
        if (this.hasLabel(labelName)) {
            this.effects.push(`${labelName} already present`);
            return this;
        }
        if (!this.app.dryRun) {
            this.thread.addLabel(this.app.getLabelByName(labelName));
        }
        this.labelNames.set(util.labelKey(labelName), labelName);
        this.effects.push(`+${labelName}`);
        return this;
    }

    removeLabel(labelName: LabelName): TakoThread {
        if (!this.hasLabel(labelName)) {
            this.effects.push(`${labelName} not present`);
            return this;
        }
        if (!this.app.dryRun) {
            this.thread.removeLabel(this.app.getLabelByName(labelName));
        }
        this.labelNames.delete(util.labelKey(labelName));
        this.effects.push(`-${labelName}`);
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
