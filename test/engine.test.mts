import assert from 'node:assert/strict';
import {test} from 'node:test';
import {github} from './github.mts';
import {loadTako, START_S} from './tako.mts';

test('the cursor is saved per filter set and the next run searches from it', () => {
    const tako = loadTako();
    const mail = github(tako.config);
    tako.addThread([mail.comment(), mail.mention()]);
    tako.run();
    assert.equal(tako.properties.user.getProperty('GitHub.lastMessageTimestamp'), String(START_S + 60));

    tako.run();
    // Each search pages until an empty page, so every query appears twice.
    assert.deepEqual([...new Set(tako.gmail.queries)], ['label:GH after:1', `label:GH after:${START_S + 60}`]);
});

test('a thread archived by hand stays archived until a new message arrives', () => {
    const tako = loadTako();
    const mail = github(tako.config);
    const thread = tako.addThread([mail.mention()]);
    tako.run();
    assert.equal(thread.location, 'inbox');

    // after: includes the cursor's second, so the thread is found again, then skipped.
    thread.location = 'archive';
    tako.run();
    assert.equal(thread.location, 'archive');
    assert.ok(tako.console.lines.some(line => line.startsWith('Skipping thread 1/1')));

    tako.addMessage(thread, mail.mention());
    tako.run();
    assert.equal(thread.location, 'inbox');
});

test('the cursor is capped at now when a message is dated in the future', () => {
    const tako = loadTako();
    const mail = github(tako.config);
    const now_s = START_S + 10 * 60;
    tako.project.setNow(now_s * 1000);
    tako.addThread([{...mail.comment(), date: new Date((now_s + 3600) * 1000)}]);
    tako.run();
    assert.equal(tako.properties.user.getProperty('GitHub.lastMessageTimestamp'), String(now_s));
});

test('writes that would change nothing are skipped', () => {
    const tako = loadTako();
    const mail = github(tako.config);
    tako.gmail.label('GH/Mention');
    tako.addThread([mail.mention(), mail.mention()], {labels: ['GH/Mention'], location: 'inbox'});
    tako.run();
    assert.deepEqual(tako.gmail.writes.filter(write => !write.startsWith('create')), []);
});

test('a dry run logs each action but writes nothing', () => {
    const tako = loadTako();
    const mail = github(tako.config);
    const thread = tako.addThread([mail.mention()]);
    tako.dryRun();
    assert.deepEqual(tako.gmail.writes, []);
    assert.deepEqual(tako.properties.user.getKeys(), []);
    assert.deepEqual(thread.labelNames(), ['GH']);
    assert.ok(tako.console.lines.some(line => line.includes('Mention: +GH/Mention, archive → inbox')));
});

test('a run is skipped while another holds the script lock', () => {
    const tako = loadTako();
    tako.lock.script.heldElsewhere = true;
    tako.run();
    assert.deepEqual(tako.gmail.queries, []);
    assert.deepEqual(tako.console.lines, ['Another run is in progress, skipping this tick.']);
});

test('at the deadline the run stops between threads and the next run resumes', () => {
    const tako = loadTako();
    const mail = github(tako.config);
    const first = tako.addThread([mail.mention()]);
    const second = tako.addThread([mail.mention()]);

    // Processing the first thread takes six minutes.
    const now_ms = (START_S + 24 * 60 * 60) * 1000;
    const getMessages = first.getMessages.bind(first);
    first.getMessages = () => {
        tako.project.setNow(now_ms + 6 * 60 * 1000);
        return getMessages();
    };
    tako.run();
    assert.equal(first.location, 'inbox');
    assert.equal(second.location, 'archive');
    assert.equal(tako.properties.user.getProperty('GitHub.lastMessageTimestamp'), String(START_S));

    tako.run();
    assert.equal(second.location, 'inbox');
});

test('each filter set keeps its own cursor', () => {
    const tako = loadTako();
    const mail = github(tako.config);
    tako.filterSets.push({name: 'Other', query: 'label:Other', filters: tako.filterSets[0].filters});
    tako.addThread([mail.comment()]);
    tako.gmail.addThread({labels: ['Other'], messages: [{...mail.comment(), date: new Date((START_S + 600) * 1000)}]});
    tako.run();
    assert.deepEqual(tako.properties.user.getProperties(), {
        'GitHub.lastMessageTimestamp': String(START_S),
        'GitHub.recentMessageIds': tako.properties.user.getProperty('GitHub.recentMessageIds'),
        'Other.lastMessageTimestamp': String(START_S + 600),
        'Other.recentMessageIds': tako.properties.user.getProperty('Other.recentMessageIds'),
    });
});
