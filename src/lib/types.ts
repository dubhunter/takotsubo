type GmailLabel = GoogleAppsScript.Gmail.GmailLabel;
type GmailMessage = GoogleAppsScript.Gmail.GmailMessage;
type GmailThread = GoogleAppsScript.Gmail.GmailThread;

enum LabelName {
    Root = 'GH',
    Approved = 'GH/Approved',
    Author = 'GH/Author',
    CI = 'GH/CI',
    Closed = 'GH/Closed',
    DirectReview = 'GH/Direct Review',
    Mention = 'GH/Mention',
    Merged = 'GH/Merged',
    Queued = 'GH/Queued',
    TeamReview = 'GH/Team Review',
}

enum UserProp {
    LastMessageTimestamp = 'LAST_MESSAGE_TIMESTAMP',
}

type GmailFilter = {
    name: string;
    rule: (message: GmailMessage) => boolean;
    action: (message: GmailMessage) => void;
    lastFilter: boolean;
};

type UserConfig = {
    emailAuthor: string;
    emailCI: string;
    usernameUser: string;
    usernameTeam: string;
}
