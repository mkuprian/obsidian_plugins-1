//Generate a logging utility with different log levels and save to log file
import { App, TFile, TFolder } from 'obsidian';

export enum LogLevel {
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR'
}

export class Logger {
    private currentLogLevel: LogLevel;
    private app: App;
    private logFolderPath: string = '.obsidian/plugins/hotkey-tag-navigation/logs';

    constructor(app: App, logLevel: LogLevel = LogLevel.INFO) {
        this.app = app;
        this.currentLogLevel = logLevel;
        this.initializeLogFolder();
    }

    private async initializeLogFolder(): Promise<void> {
        try {
            // Check if logs folder exists, create if not
            const logFolder = this.app.vault.getAbstractFileByPath(this.logFolderPath);
            if (!logFolder) {
                await this.app.vault.createFolder(this.logFolderPath);
            }
        } catch (error) {
            console.warn('Could not create log folder:', error);
        }
    }

    private async appendToLogFile(message: string): Promise<void> {
        try {
            const logFileName = `log_${new Date().toISOString().slice(0, 10)}.txt`;
            const logFilePath = `${this.logFolderPath}/${logFileName}`;

            // Try to read the file first to check if it exists
            try {
                const logFile = this.app.vault.getAbstractFileByPath(logFilePath);
                if (logFile instanceof TFile) {
                    // File exists, read and append
                    const currentContent = await this.app.vault.read(logFile);
                    await this.app.vault.modify(logFile, currentContent + message + '\n');
                    return;
                }
            } catch (readError) {
                // File might not exist, continue to create it
            }

            // File doesn't exist or couldn't be read, try to create it
            try {
                await this.app.vault.create(logFilePath, message + '\n');
            } catch (createError) {
                // Final fallback: try one more time to find and append to existing file
                try {
                    const existingFile = this.app.vault.getAbstractFileByPath(logFilePath);
                    if (existingFile instanceof TFile) {
                        const currentContent = await this.app.vault.read(existingFile);
                        await this.app.vault.modify(existingFile, currentContent + message + '\n');
                    } else {
                        // Give up and just log to console
                        console.warn('Could not create or find log file, logging to console only:', message);
                    }
                } catch (finalError) {
                    console.warn('All log file operations failed, logging to console only:', message);
                }
            }
        } catch (error) {
            console.warn('Could not write to log file:', error);
        }
    }

    public info(message: string): void {
        if (this.shouldLog(LogLevel.INFO)) {
            console.info(`[INFO]: ${message}`);
            this.appendToLogFile(`[INFO]: ${message}`);
        }
    }

    public warn(message: string): void {
        if (this.shouldLog(LogLevel.WARN)) {
            console.warn(`[WARN]: ${message}`);
            this.appendToLogFile(`[WARN]: ${message}`);
        }
    }

    public error(message: string): void {
        if (this.shouldLog(LogLevel.ERROR)) {
            console.error(`[ERROR]: ${message}`);
            this.appendToLogFile(`[ERROR]: ${message}`);
        }
    }

    public debug(message: string): void {
        if (this.shouldLog(LogLevel.DEBUG)) {
            console.debug(`[DEBUG]: ${message}`);
            this.appendToLogFile(`[DEBUG]: ${message}`);
        }
    }

    private shouldLog(level: LogLevel): boolean {
        const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
        return levels.indexOf(level) >= levels.indexOf(this.currentLogLevel);
    }

    public setLogLevel(level: LogLevel): void {
        this.currentLogLevel = level;
    }
}