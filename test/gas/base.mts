// Fakes for console, Session and Utilities.

// Records log lines instead of printing them.
export class FakeConsole {
    lines: string[] = [];

    log(...args: unknown[]): void {
        this.lines.push(args.map(String).join(' '));
    }

    info(...args: unknown[]): void {
        this.log(...args);
    }

    warn(...args: unknown[]): void {
        this.log(...args);
    }

    error(...args: unknown[]): void {
        this.log(...args);
    }
}

export class FakeSession {
    timeZone = 'UTC';

    getScriptTimeZone(): string {
        return this.timeZone;
    }
}

export class FakeUtilities {
    // Supports the common SimpleDateFormat fields; anything else throws so a gap is obvious.
    formatDate(date: Date, timeZone: string, pattern: string): string {
        const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
            timeZone, hourCycle: 'h23',
            year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
        }).formatToParts(date).map(part => [part.type, part.value]));
        const monthName = new Intl.DateTimeFormat('en-US', {timeZone, month: 'short'}).format(date);
        const pad = (value: string | undefined) => (value ?? '').padStart(2, '0');
        const fields: Record<string, string> = {
            yyyy: parts['year'], MMM: monthName, MM: pad(parts['month']), M: parts['month'], dd: pad(parts['day']), d: parts['day'],
            HH: pad(parts['hour']), H: parts['hour'], mm: pad(parts['minute']), ss: pad(parts['second']),
        };
        return pattern.replace(/[A-Za-z]+/g, field => {
            if (!(field in fields)) {
                throw new Error(`Not implemented: formatDate field "${field}"`);
            }
            return fields[field];
        });
    }
}
