const config: UserConfig = {
    // GitHub sends account and organization mail from this; repo activity comes from notifications@github.com.
    emailAccount: 'noreply@github.com',
    // GitHub cc's this on activity in a PR you opened.
    emailAuthor: 'author@noreply.github.com',
    // GitHub cc's this on Actions run notifications.
    emailCI: 'ci_activity@noreply.github.com',
    // Matched anywhere in the body, to catch mentions.
    usernameUser: '@dubhunter',
    // Matched in "requested review from <team>".
    usernameTeam: '@SocketDev/firewall',
}
