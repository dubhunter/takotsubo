// Every filter runs on every message of a thread, oldest first, so labels act as state (for example Queued, then Merged).
// Within one message, filters run in list order, so a rule whose guard reads a label must come after the rule that sets it.
// A set's query only picks candidate threads; what happens to them is decided here.
const filterSets: FilterSet[] = [
    {
        name: 'GitHub',
        query: 'label:GH',
        filters: [
            // Your relationship to the PR. These run first, so the guards below see them.
            {
                name: 'Author',
                // The second clause is GitHub's footer when you closed or reopened the PR yourself.
                rule: t => t.ccContains(config.emailAuthor)
                    || t.bodyContains('You are receiving this because you modified the open/close state.'),
                action: t => t.addLabel(LabelName.Author).moveToInbox(),
                lastFilter: false,
            },
            {
                name: 'Direct Review',
                rule: t => t.bodyContains(new RegExp('@[A-Za-z0-9-]+(\\[bot\\])? requested your review on:')),
                action: t => t.addLabel(LabelName.DirectReview).moveToInbox({ifNotHasLabelsAny: [LabelName.Muted]}),
                lastFilter: false,
            },
            {
                name: 'Team Review',
                rule: t => t.bodyContains(new RegExp(`@[A-Za-z0-9-]+(\\[bot\\])? requested review from ${config.usernameTeam} on:`)),
                action: t => t.addLabel(LabelName.TeamReview).moveToInbox({ifNotHasLabelsAny: [LabelName.Muted]}),
                lastFilter: false,
            },
            {
                name: 'Mention',
                rule: t => t.bodyContains(config.usernameUser),
                action: t => t.addLabel(LabelName.Mention).moveToInbox({ifNotHasLabelsAny: [LabelName.Muted]}),
                lastFilter: false,
            },

            // State changes, in lifecycle order.
            {
                name: 'Approved',
                rule: t => t.bodyContains(new RegExp('@[A-Za-z0-9-]+(\\[bot\\])? approved this pull request\\.')),
                action: t => t.addLabel(LabelName.Approved).moveToArchive({ifNotHasLabelsAny: [LabelName.Author, LabelName.DirectReview]}),
                lastFilter: false,
            },
            {
                name: 'Queued',
                rule: t => t.bodyContains(new RegExp('#[0-9]+ was added to the \\[?merge queue')),
                action: t => t.addLabel(LabelName.Queued),
                lastFilter: false,
            },
            {
                name: 'UnQueued',
                rule: t => t.bodyContains(new RegExp('#[0-9]+ was (automatically|manually) removed from the \\[?merge queue')),
                action: t => t.removeLabel(LabelName.Queued),
                lastFilter: false,
            },
            {
                name: 'Merged',
                rule: t => t.bodyContains(new RegExp('Merged #[0-9]+( into [^ ]+)?\\.')),
                action: t => t.removeLabel(LabelName.Queued).addLabel(LabelName.Merged).moveToTrash({ifNotHasLabelsAny: [LabelName.Author, LabelName.DirectReview]}),
                lastFilter: false,
            },
            {
                name: 'Closed',
                rule: t => t.bodyContains(new RegExp('Closed #[0-9]+\\.')),
                action: t => t.addLabel(LabelName.Closed).moveToTrash({ifNotHasLabelsAny: [LabelName.Author, LabelName.DirectReview]}),
                lastFilter: false,
            },
            {
                name: 'Reopened',
                // Only after a close we saw, so it can undo it (moving to the inbox also takes a thread out of the trash).
                rule: t => t.hasLabel(LabelName.Closed)
                    && t.bodyContains(new RegExp('Reopened #[0-9]+\\.')),
                action: t => t.removeLabel(LabelName.Closed).moveToInbox({ifNotHasLabelsAny: [LabelName.Muted]}),
                lastFilter: false,
            },

            // Automated mail.
            {
                name: 'CI',
                rule: t => t.ccContains(config.emailCI),
                action: t => {
                    t.addLabel(LabelName.CI);
                    if (t.subjectContains(new RegExp('run cancelled:', 'i'))) {
                        t.moveToTrash();
                    } else {
                        t.moveToInbox();
                    }
                },
                lastFilter: false,
            },
            {
                // A PR opened by a bot (release bumps, dependabot), seen when it requests a review.
                name: 'Bot',
                rule: t => t.bodyContains(new RegExp('@[A-Za-z0-9-]+\\[bot\\] requested (your review|review from)')),
                action: t => t.addLabel(LabelName.Bot),
                lastFilter: false,
            },
            {
                // Linear's comment pasting the linked ticket into the PR; nothing to act on.
                name: 'Linear Linkback',
                rule: t => t.bodyContains('<!-- linear-linkback -->'),
                action: t => t.moveToArchive(),
                lastFilter: false,
            },
        ],
    },
];
