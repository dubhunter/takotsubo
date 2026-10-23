import assert from 'node:assert/strict';
import {test} from 'node:test';
import {github} from './github.mts';
import {loadTako} from './tako.mts';

// Whole conversations replayed oldest first, where labels from earlier messages decide later actions.

test('queued, then merged: Merged replaces Queued and the thread is trashed', () => {
    const tako = loadTako();
    const mail = github(tako.config);
    const thread = tako.addThread([mail.queued(), mail.merged()]);
    tako.run();
    assert.deepEqual(thread.labelNames(), ['GH', 'GH/Merged']);
    assert.equal(thread.location, 'trash');
});

test('queued, then removed from the queue: no labels left, still archived', () => {
    const tako = loadTako();
    const mail = github(tako.config);
    const thread = tako.addThread([mail.queued(), mail.unqueued()]);
    tako.run();
    assert.deepEqual(thread.labelNames(), ['GH']);
    assert.equal(thread.location, 'archive');
});

test('closed, then reopened: Reopened brings the thread back out of the trash', () => {
    const tako = loadTako();
    const mail = github(tako.config);
    const thread = tako.addThread([mail.closed(), mail.reopened()]);
    tako.run();
    assert.deepEqual(thread.labelNames(), ['GH']);
    assert.equal(thread.location, 'inbox');
});

test('your review requested, then merged: the thread stays in the inbox', () => {
    const tako = loadTako();
    const mail = github(tako.config);
    const thread = tako.addThread([mail.reviewRequested(), mail.merged()]);
    tako.run();
    assert.deepEqual(thread.labelNames(), ['GH', 'GH/Direct Review', 'GH/Merged']);
    assert.equal(thread.location, 'inbox');
});

test('your PR, then approved: Author keeps it in the inbox', () => {
    const tako = loadTako();
    const mail = github(tako.config);
    const thread = tako.addThread([mail.commentOnYourPr(), mail.approved()]);
    tako.run();
    assert.deepEqual(thread.labelNames(), ['GH', 'GH/Approved', 'GH/Author']);
    assert.equal(thread.location, 'inbox');
});

test('approved, then a mention: the later mention wins', () => {
    const tako = loadTako();
    const mail = github(tako.config);
    const thread = tako.addThread([mail.approved(), mail.mention()]);
    tako.run();
    assert.deepEqual(thread.labelNames(), ['GH', 'GH/Approved', 'GH/Mention']);
    assert.equal(thread.location, 'inbox');
});

test('muted: a mention and a review request leave it archived', () => {
    const tako = loadTako();
    const mail = github(tako.config);
    const thread = tako.addThread([mail.mention(), mail.reviewRequested()], {labels: ['GH/Muted']});
    tako.run();
    assert.deepEqual(thread.labelNames(), ['GH', 'GH/Direct Review', 'GH/Mention', 'GH/Muted']);
    assert.equal(thread.location, 'archive');
});
