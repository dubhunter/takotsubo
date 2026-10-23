import path from 'node:path';
import {FakeConsole, FakeSession, FakeUtilities} from './gas/base.mts';
import {FakeGmailApp, type FakeGmailThread, type FakeLocation, type FakeMessageInit} from './gas/gmail.mts';
import {FakeLockService} from './gas/lock.mts';
import {loadGas} from './gas/loader.mts';
import {FakePropertiesService} from './gas/properties.mts';

const DIST = path.resolve(import.meta.dirname, '../dist');

// Message times count up from here, one minute apart.
export const START_S = Date.UTC(2026, 9, 1) / 1000;

export type Notification = Omit<FakeMessageInit, 'date'> & {date?: Date};

// A fresh copy of the built app with its own fakes, and the clock set a day after START_S.
export function loadTako() {
    const gmail = new FakeGmailApp();
    const properties = new FakePropertiesService();
    const lock = new FakeLockService();
    const console = new FakeConsole();
    const project = loadGas(DIST, {
        GmailApp: gmail,
        PropertiesService: properties,
        LockService: lock,
        Session: new FakeSession(),
        Utilities: new FakeUtilities(),
        console,
    });
    project.setNow((START_S + 24 * 60 * 60) * 1000);
    let minute = 0;
    const nextDate = () => new Date((START_S + 60 * minute++) * 1000);

    return {
        gmail, properties, lock, console, project,
        config: project.get<UserConfig>('config'),
        filterSets: project.get<FilterSet[]>('filterSets'),
        run: () => project.get<() => void>('run')(),
        dryRun: () => project.get<() => void>('dryRun')(),

        // A GitHub notification thread as the Gmail filter leaves it: labeled GH and archived.
        addThread(messages: Notification[], options: {labels?: string[]; location?: FakeLocation} = {}): FakeGmailThread {
            return gmail.addThread({
                labels: ['GH', ...(options.labels ?? [])],
                location: options.location ?? 'archive',
                messages: messages.map(message => ({...message, date: message.date ?? nextDate()})),
            });
        },

        // New mail on an existing thread, dated after everything so far.
        addMessage(thread: FakeGmailThread, message: Notification) {
            return thread.addMessage({...message, date: message.date ?? nextDate()});
        },
    };
}

export type Tako = ReturnType<typeof loadTako>;
