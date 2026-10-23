enum LabelName {
    // Applied by the Gmail filter (from:(@github.com)), not by Takotsubo.
    Root = 'GH',
    Approved = 'GH/Approved',
    Author = 'GH/Author',
    CI = 'GH/CI',
    Closed = 'GH/Closed',
    DirectReview = 'GH/Direct Review',
    Mention = 'GH/Mention',
    Merged = 'GH/Merged',
    Muted = 'GH/Muted',
    Queued = 'GH/Queued',
    TeamReview = 'GH/Team Review',
}

enum UserProp {
    LastMessageTimestamp = 'lastMessageTimestamp',
    RecentMessageIds = 'recentMessageIds',
}

// The rule and action get one message, but actions apply to its whole thread.
// lastFilter stops later filters for that message only.
type GmailFilter = {
    name: string;
    rule: (message: TakoMessage) => boolean;
    action: (message: TakoMessage) => void;
    lastFilter: boolean;
};

// A search query and the filters to run on the threads it finds. Each set keeps its own cursor.
type FilterSet = {
    name: string;
    query: string;
    filters: GmailFilter[];
};

type UserConfig = {
    emailAuthor: string;
    emailCI: string;
    usernameUser: string;
    usernameTeam: string;
}

// Skip the move if the thread has any of these labels. This is how Muted works.
type MoveActionOptions = {
    ifNotHasLabelsAny?: LabelName[];
}

enum ThreadLocation {
    Inbox = 'inbox',
    Archive = 'archive',
    Trash = 'trash',
}
