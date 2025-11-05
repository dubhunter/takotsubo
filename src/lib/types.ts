enum LabelName {
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
    LastMessageId = 'LAST_MESSAGE_ID',
    LastMessageTimestamp = 'LAST_MESSAGE_TIMESTAMP',
}

type GmailFilter = {
    name: string;
    rule: (message: TakoMessage) => boolean;
    action: (message: TakoMessage) => void;
    lastFilter: boolean;
};

type UserConfig = {
    emailAuthor: string;
    emailCI: string;
    usernameUser: string;
    usernameTeam: string;
}
