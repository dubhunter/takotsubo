import assert from 'node:assert/strict';
import {describe, test} from 'node:test';
import type {FakeLocation} from './gas/gmail.mts';
import {github} from './github.mts';
import {loadTako, type Notification} from './tako.mts';

// One notification on a fresh GitHub thread (labeled GH, archived), and where each rule leaves it.
type Case = {
    name: string;
    notification: (mail: ReturnType<typeof github>) => Notification;
    labels?: string[];
    location?: FakeLocation;
    expectLabels: string[];
    expectLocation: FakeLocation;
};

const cases: Case[] = [
    {name: 'Approved archives', notification: m => m.approved(), location: 'inbox', expectLabels: ['GH/Approved'], expectLocation: 'archive'},
    {name: 'Approved by a bot', notification: m => m.approvedByBot(), location: 'inbox', expectLabels: ['GH/Approved'], expectLocation: 'archive'},
    {name: 'Approved stays put on your PR', notification: m => m.approved(), labels: ['GH/Author'], location: 'inbox', expectLabels: ['GH/Approved', 'GH/Author'], expectLocation: 'inbox'},
    {name: 'Author from the author cc', notification: m => m.commentOnYourPr(), expectLabels: ['GH/Author'], expectLocation: 'inbox'},
    {name: 'Author from closing it yourself', notification: m => m.youClosed(), expectLabels: ['GH/Author', 'GH/Closed'], expectLocation: 'inbox'},
    {name: 'CI failure', notification: m => m.ciFailed(), expectLabels: ['GH/CI'], expectLocation: 'inbox'},
    {name: 'CI cancelled is trashed', notification: m => m.ciCancelled(), expectLabels: ['GH/CI'], expectLocation: 'trash'},
    {name: 'Closed is trashed', notification: m => m.closed(), expectLabels: ['GH/Closed'], expectLocation: 'trash'},
    {name: 'Closed stays put when your review was requested', notification: m => m.closed(), labels: ['GH/Direct Review'], location: 'inbox', expectLabels: ['GH/Closed', 'GH/Direct Review'], expectLocation: 'inbox'},
    {name: 'Direct Review', notification: m => m.reviewRequested(), expectLabels: ['GH/Direct Review'], expectLocation: 'inbox'},
    {name: 'Direct Review respects Muted', notification: m => m.reviewRequested(), labels: ['GH/Muted'], expectLabels: ['GH/Direct Review', 'GH/Muted'], expectLocation: 'archive'},
    {name: 'Mention', notification: m => m.mention(), expectLabels: ['GH/Mention'], expectLocation: 'inbox'},
    {name: 'Mention respects Muted', notification: m => m.mention(), labels: ['GH/Muted'], expectLabels: ['GH/Mention', 'GH/Muted'], expectLocation: 'archive'},
    {name: 'Merged is trashed', notification: m => m.merged(), expectLabels: ['GH/Merged'], expectLocation: 'trash'},
    {name: 'Merged clears Queued', notification: m => m.merged(), labels: ['GH/Queued'], expectLabels: ['GH/Merged'], expectLocation: 'trash'},
    {name: 'Queued labels without moving', notification: m => m.queued(), expectLabels: ['GH/Queued'], expectLocation: 'archive'},
    {name: 'UnQueued', notification: m => m.unqueued(), labels: ['GH/Queued'], expectLabels: [], expectLocation: 'archive'},
    {name: 'Reopened restores a closed thread', notification: m => m.reopened(), labels: ['GH/Closed'], expectLabels: [], expectLocation: 'inbox'},
    {name: 'Reopened needs Closed', notification: m => m.reopened(), expectLabels: [], expectLocation: 'archive'},
    {name: 'Team Review', notification: m => m.teamReviewRequested(), expectLabels: ['GH/Team Review'], expectLocation: 'inbox'},
    {name: 'Bot PR requesting your review', notification: m => m.reviewRequestedByBot(), expectLabels: ['GH/Bot', 'GH/Direct Review'], expectLocation: 'inbox'},
    {name: 'Bot PR requesting your team\'s review', notification: m => m.teamReviewRequestedByBot(), expectLabels: ['GH/Bot', 'GH/Team Review'], expectLocation: 'inbox'},
    {name: 'Linear Linkback archives, after Author labels it', notification: m => m.linearLinkback(), location: 'inbox', expectLabels: ['GH/Author'], expectLocation: 'archive'},
    {name: 'A plain comment does nothing', notification: m => m.comment(), expectLabels: [], expectLocation: 'archive'},
];

describe('GitHub rules', () => {
    for (const c of cases) {
        test(c.name, () => {
            const tako = loadTako();
            const thread = tako.addThread([c.notification(github(tako.config))], {labels: c.labels, location: c.location});
            tako.run();
            assert.deepEqual(thread.labelNames(), ['GH', ...c.expectLabels].sort());
            assert.equal(thread.location, c.expectLocation);
        });
    }
});
