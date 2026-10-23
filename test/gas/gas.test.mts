import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {test} from 'node:test';
import {FakeUtilities} from './base.mts';
import {FakeGmailApp} from './gmail.mts';
import {loadGas} from './loader.mts';

function projectDir(files: Record<string, string>): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gas-test-'));
    for (const [name, code] of Object.entries(files)) {
        fs.mkdirSync(path.dirname(path.join(dir, name)), {recursive: true});
        fs.writeFileSync(path.join(dir, name), code);
    }
    return dir;
}

test('loader: files share one scope, and classes and consts are readable', () => {
    const dir = projectDir({
        'a.js': 'function greet() { return new Greeter().hello(); }',
        'lib/b.js': 'class Greeter { hello() { return GREETING; } }\nconst GREETING = "hi";',
    });
    const project = loadGas(dir, {});
    assert.equal(project.get<() => string>('greet')(), 'hi');
    assert.equal(project.get<string>('GREETING'), 'hi');
});

test('loader: setNow fixes Date.now inside the project', () => {
    const project = loadGas(projectDir({'a.js': 'function now() { return Date.now(); }'}), {});
    project.setNow(1234);
    assert.equal(project.get<() => number>('now')(), 1234);
});

test('gmail search: after:N includes second N, and after:0 matches nothing', () => {
    const gmail = new FakeGmailApp();
    gmail.addThread({labels: ['GH'], messages: [{date: new Date(1000 * 1000)}]});
    assert.equal(gmail.search('label:GH after:1000').length, 1);
    assert.equal(gmail.search('label:GH after:1001').length, 0);
    assert.equal(gmail.search('label:GH after:0').length, 0);
});

test('gmail search: matches per message, skips the trash, and caps max at 500', () => {
    const gmail = new FakeGmailApp();
    const thread = gmail.addThread({labels: ['GH'], messages: [{date: new Date(1000)}, {date: new Date(5000 * 1000)}]});
    assert.equal(gmail.search('label:GH after:5000').length, 1);
    thread.moveToTrash();
    assert.equal(gmail.search('label:GH').length, 0);
    assert.equal(gmail.search('in:trash').length, 1);
    assert.throws(() => gmail.search('label:GH', 0, 501), /cannot exceed 500/);
    assert.throws(() => gmail.search('older_than:7d'), /Not implemented/);
});

test('gmail: moveToInbox takes a thread out of the trash', () => {
    const gmail = new FakeGmailApp();
    const thread = gmail.addThread({location: 'trash', messages: [{date: new Date()}]});
    thread.moveToInbox();
    assert.equal(thread.isInTrash(), false);
    assert.equal(thread.isInInbox(), true);
});

test('utilities: formatDate uses SimpleDateFormat fields', () => {
    const date = new Date(Date.UTC(2026, 9, 22, 7, 5));
    assert.equal(new FakeUtilities().formatDate(date, 'UTC', 'MMM d HH:mm'), 'Oct 22 07:05');
    assert.equal(new FakeUtilities().formatDate(date, 'America/Los_Angeles', 'yyyy-MM-dd HH:mm'), '2026-10-22 00:05');
});
