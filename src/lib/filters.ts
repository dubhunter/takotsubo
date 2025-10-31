const gmailFilters: GmailFilter[] = [
    {
        name: 'Approved',
        rule: message => new RegExp('@[A-Za-z0-9-]+ approved this pull request\\.').test(message.getPlainBody()),
        action: message => {
            actions.addLabelToMessage(LabelName.Approved, message);
            if (!helpers.hasAnyLabels([LabelName.Author, LabelName.DirectReview], message)) {
                message.getThread().moveToArchive();
            }
        },
        lastFilter: false,
    },
    {
        name: 'Author',
        rule: message => message.getCc().includes(config.emailAuthor)
            || message.getPlainBody().includes('You are receiving this because you modified the open/close state.'),
        action: message => {
            actions.addLabelToMessage(LabelName.Author, message);
            message.getThread().moveToInbox();
        },
        lastFilter: false,
    },
    {
        name: 'CI',
        rule: message => message.getCc().includes(config.emailCI),
        action: message => {
            actions.addLabelToMessage(LabelName.CI, message);
            if (message.getSubject().includes("Run cancelled:")) {
                message.getThread().moveToTrash();
            } else {
                message.getThread().moveToInbox();
            }
        },
        lastFilter: false,
    },
    {
        name: 'Closed',
        rule: message => new RegExp('Closed #[0-9]+\\.').test(message.getPlainBody()),
        action: message => {
            actions.addLabelToMessage(LabelName.Closed, message);
            if (!helpers.hasAnyLabels([LabelName.Author, LabelName.DirectReview], message)) {
                message.getThread().moveToTrash();
            }
        },
        lastFilter: false,
    },
    {
        name: 'Direct Review',
        rule: message => new RegExp('@[A-Za-z0-9-]+ requested your review on:').test(message.getPlainBody()),
        action: message => {
            actions.addLabelToMessage(LabelName.DirectReview, message);
            message.getThread().moveToInbox();
        },
        lastFilter: false,
    },
    {
        name: 'Mention',
        rule: message => message.getPlainBody().includes(config.usernameUser),
        action: message => {
            actions.addLabelToMessage(LabelName.Mention, message);
            message.getThread().moveToInbox();
        },
        lastFilter: false,
    },
    {
        name: 'Merged',
        rule: message => new RegExp('Merged #[0-9]+( into (main|master))?\\.').test(message.getPlainBody()),
        action: message => {
            actions.removeLabelFromMessage(LabelName.Queued, message);
            actions.addLabelToMessage(LabelName.Merged, message);
            if (!helpers.hasAnyLabels([LabelName.Author, LabelName.DirectReview], message)) {
                message.getThread().moveToTrash();
            }
        },
        lastFilter: false,
    },
    {
        name: 'Queued',
        rule: message => new RegExp('#[0-9]+ was added to the \\[merge queue]').test(message.getPlainBody()),
        action: message => actions.addLabelToMessage(LabelName.Queued, message),
        lastFilter: false,
    },
    {
        name: 'UnQueued',
        rule: message => new RegExp('#[0-9]+ was automatically removed from the \\[merge queue]').test(message.getPlainBody()),
        action: message => actions.removeLabelFromMessage(LabelName.Queued, message),
        lastFilter: false,
    },
    {
        name: 'Reopened',
        rule: message => helpers.hasLabel(LabelName.Closed, message)
                && new RegExp('Reopened #[0-9]+\\./').test(message.getPlainBody()),
        action: message => actions.removeLabelFromMessage(LabelName.Closed, message),
        lastFilter: false,
    },
    {
        name: 'Team Review',
        rule: message => new RegExp(`@[A-Za-z0-9-]+ requested review from ${config.usernameTeam} on:`).test(message.getPlainBody()),
        action: message => {
            actions.addLabelToMessage(LabelName.TeamReview, message);
            message.getThread().moveToInbox();
        },
        lastFilter: false,
    },
];
