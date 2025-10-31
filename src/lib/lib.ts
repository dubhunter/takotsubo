const actions = {
    addLabelToMessage: (labelName: LabelName, message: GmailMessage): void => {
        const label = GmailApp.getUserLabelByName(labelName);
        message.getThread().addLabel(label);
    },
    removeLabelFromMessage: (labelName: string, message: GmailMessage): void => {
        const label = GmailApp.getUserLabelByName(labelName);
        message.getThread().removeLabel(label);
    },
};

const helpers = {
    hasAnyLabels: (labelNames: LabelName[], message: GmailMessage): boolean => {
        for (const label of message.getThread().getLabels()) {
            if (labelNames.includes(label.getName() as LabelName)) {
                return true;
            }
        }
        return false;
    },
    hasLabel: (labelName: LabelName, message: GmailMessage): boolean => {
        return helpers.hasAnyLabels([labelName], message);
    }
};
