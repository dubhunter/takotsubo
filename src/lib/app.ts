const userProperties = PropertiesService.getUserProperties();

const app = {
    setLastMessageTime: (message: GmailMessage) => {
        const messageTime = message.getDate().getTime() / 1000;
        if (messageTime > app.getLastMessageTime()) {
            userProperties.setProperty(UserProp.LastMessageTimestamp, messageTime.toString());
        }
    },
    getLastMessageTime: () => {
        return Number(userProperties.getProperty(UserProp.LastMessageTimestamp) || 0);
    },
    resetProperties: () => {
        userProperties.deleteAllProperties();
        console.info('User properties deleted.');
    },
    ensureLabels: () => {
        console.info('Ensure labels...');
        const userLabelNames: string[] = [];
        for (const label of GmailApp.getUserLabels()) {
            userLabelNames.push(label.getName().toLowerCase());
        }
        const missingLabelNames = Object.values(LabelName).filter(labelName => !userLabelNames.includes(labelName.toLowerCase()));
        for (const labelName of missingLabelNames) {
            console.info(`Creating label: ${labelName}`);
            GmailApp.createLabel(labelName);
        }
    },
    listFilters: () => {
        for (const filter of gmailFilters) {
            console.info(`Filter: ${filter.name}`);
        }
    },
    processNewMessages: () => {
        app.ensureLabels();
        const query = `label:GH after:${app.getLastMessageTime() + 1}`;
        console.info(`Searching: ${query}`);
        const threads = GmailApp.search(query);
        const count = threads.length;
        console.info(`Found ${count} threads`);
        for (const [i, thread] of threads.entries()) {
            console.info(`Processing thread ${i + 1}/${count}: ${thread.getFirstMessageSubject()}`);
            const messages = thread.getMessages();
            for (const message of messages) {
                for (const filter of gmailFilters) {
                    if (filter.rule(message)) {
                        console.info(`Running action for filter: ${filter.name}`);
                        filter.action(message);
                        if (filter.lastFilter) {
                            break
                        }
                    }
                }
                app.setLastMessageTime(message);
            }
        }
        console.info('Done!');
    },
};
