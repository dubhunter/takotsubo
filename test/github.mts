import type {Notification} from './tako.mts';

// GitHub notification emails, written to match the formats seen in real mail (not copied from it).
// Usernames and the team come from config, so these follow whatever install is built.

const REPO = 'example-org/example-repo';
const PR = 570;

function footer(reason: string): string {
    return `\nReply to this email directly, view it on GitHub, or unsubscribe.\nYou are receiving this because ${reason}.\n`;
}

export function github(config: UserConfig) {
    return {
        approved: (): Notification => ({
            body: `@octocat approved this pull request.\n${footer('you are subscribed to this thread')}`,
        }),
        approvedByBot: (): Notification => ({
            body: `@review-bot[bot] approved this pull request.\n${footer('you are subscribed to this thread')}`,
        }),
        commentOnYourPr: (): Notification => ({
            cc: `Example <${config.emailAuthor}>`,
            body: `Looks good, one question inline.\n${footer('you authored the thread')}`,
        }),
        youClosed: (): Notification => ({
            body: `Closed #${PR}.\n${footer('you modified the open/close state')}`,
        }),
        ciFailed: (): Notification => ({
            cc: `CI activity <${config.emailCI}>`,
            subject: `[${REPO}] Run failed: CI - main (abc1234)`,
            body: `CI: some jobs were not successful.\n${footer('you are subscribed to this thread')}`,
        }),
        ciCancelled: (): Notification => ({
            cc: `CI activity <${config.emailCI}>`,
            subject: `[${REPO}] Run cancelled: CI - main (abc1234)`,
            body: `CI: the run was cancelled.\n${footer('you are subscribed to this thread')}`,
        }),
        closed: (): Notification => ({
            body: `Closed #${PR}.\n${footer('you are subscribed to this thread')}`,
        }),
        reviewRequested: (): Notification => ({
            body: `@octocat requested your review on: ${REPO}#${PR} Add a feature.\n${footer('your review was requested')}`,
        }),
        mention: (): Notification => ({
            body: `${config.usernameUser} can you take a look?\n${footer('you were mentioned')}`,
        }),
        merged: (): Notification => ({
            body: `Merged #${PR} into main.\n${footer('you are subscribed to this thread')}`,
        }),
        queued: (): Notification => ({
            body: `#${PR} was added to the [merge queue](https://github.com/${REPO}/queue/main).\n${footer('you are subscribed to this thread')}`,
        }),
        unqueued: (): Notification => ({
            body: `#${PR} was automatically removed from the merge queue.\n${footer('you are subscribed to this thread')}`,
        }),
        reopened: (): Notification => ({
            body: `Reopened #${PR}.\n${footer('you are subscribed to this thread')}`,
        }),
        teamReviewRequested: (): Notification => ({
            body: `@review-bot[bot] requested review from ${config.usernameTeam} on: ${REPO}#${PR} Add a feature.\n${footer('your team was requested to review')}`,
        }),
        linearLinkback: (): Notification => ({
            cc: `Example <${config.emailAuthor}>`,
            body: `linear-code[bot] left a comment (${REPO}#${PR})\n\n<!-- linear-linkback -->\n<details>\n<summary>EX-1 Add a feature</summary>\n<p>The ticket description.</p>\n</details>\n<!-- linear-review-link -->\n${footer('you authored the thread')}`,
        }),
        comment: (): Notification => ({
            body: `Thanks, updated.\n${footer('you are subscribed to this thread')}`,
        }),
    };
}
