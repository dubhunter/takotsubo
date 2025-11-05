const gmailFilters: GmailFilter[] = [
    {
        name: 'Approved',
        rule: t => t.bodyContains(new RegExp('@[A-Za-z0-9-]+ approved this pull request\\.')),
        action: t => t.addLabel(LabelName.Approved).moveToArchive([LabelName.Author, LabelName.DirectReview]),
        lastFilter: false,
    },
    {
        name: 'Author',
        rule: t => t.ccContains(config.emailAuthor)
            || t.bodyContains('You are receiving this because you modified the open/close state.'),
        action: t => t.addLabel(LabelName.Author).moveToInbox(),
        lastFilter: false,
    },
    {
        name: 'CI',
        rule: t => t.ccContains(config.emailCI),
        action: t => {
            t.addLabel(LabelName.CI);
            if (t.subjectContains("Run cancelled:")) {
                t.moveToTrash();
            } else {
                t.moveToInbox();
            }
        },
        lastFilter: false,
    },
    {
        name: 'Closed',
        rule: t => t.bodyContains(new RegExp('Closed #[0-9]+\\.')),
        action: t => t.addLabel(LabelName.Closed).moveToTrash([LabelName.Author, LabelName.DirectReview]),
        lastFilter: false,
    },
    {
        name: 'Direct Review',
        rule: t => t.bodyContains(new RegExp('@[A-Za-z0-9-]+ requested your review on:')),
        action: t => t.addLabel(LabelName.DirectReview).moveToInbox([LabelName.Muted]),
        lastFilter: false,
    },
    {
        name: 'Mention',
        rule: t => t.bodyContains(config.usernameUser),
        action: t => t.addLabel(LabelName.Mention).moveToInbox([LabelName.Muted]),
        lastFilter: false,
    },
    {
        name: 'Merged',
        rule: t => t.bodyContains(new RegExp('Merged #[0-9]+( into (main|master))?\\.')),
        action: t => t.removeLabel(LabelName.Queued).addLabel(LabelName.Merged).moveToTrash([LabelName.Author, LabelName.DirectReview]),
        lastFilter: false,
    },
    {
        name: 'Queued',
        rule: t => t.bodyContains(new RegExp('#[0-9]+ was added to the \\[merge queue]')),
        action: t => t.addLabel(LabelName.Queued),
        lastFilter: false,
    },
    {
        name: 'UnQueued',
        rule: t => t.bodyContains(new RegExp('#[0-9]+ was automatically removed from the \\[merge queue]')),
        action: t => t.removeLabel(LabelName.Queued),
        lastFilter: false,
    },
    {
        name: 'Reopened',
        rule: t => t.hasLabel(LabelName.Closed)
            && t.bodyContains(new RegExp('Reopened #[0-9]+\\./')),
        action: t => t.removeLabel(LabelName.Closed),
        lastFilter: false,
    },
    {
        name: 'Team Review',
        rule: t => t.bodyContains(new RegExp(`@[A-Za-z0-9-]+ requested review from ${config.usernameTeam} on:`)),
        action: t => t.addLabel(LabelName.TeamReview).moveToInbox([LabelName.Muted]),
        lastFilter: false,
    },
];
