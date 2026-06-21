export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

const LEVEL_LABELS: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: ' INFO',
  [LogLevel.WARN]: ' WARN',
  [LogLevel.ERROR]: 'ERROR',
};

const LEVEL_COLORS: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: '\x1b[90m',
  [LogLevel.INFO]: '\x1b[36m',
  [LogLevel.WARN]: '\x1b[33m',
  [LogLevel.ERROR]: '\x1b[31m',
};

const RESET = '\x1b[0m';

export class Logger {
  private level: LogLevel;
  private prefix: string;

  constructor(prefix: string, level: LogLevel = LogLevel.INFO) {
    this.level = level;
    this.prefix = prefix;
  }

  private log(level: LogLevel, message: string): void {
    if (level < this.level) return;
    const timestamp = new Date().toISOString().slice(11, 19);
    const color = LEVEL_COLORS[level];
    const label = LEVEL_LABELS[level];
    console.log(`${color}[${timestamp}] [${label}] [${this.prefix}]${RESET} ${message}`);
  }

  debug(message: string): void {
    this.log(LogLevel.DEBUG, message);
  }

  info(message: string): void {
    this.log(LogLevel.INFO, message);
  }

  warn(message: string): void {
    this.log(LogLevel.WARN, message);
  }

  error(message: string): void {
    this.log(LogLevel.ERROR, message);
  }

  child(prefix: string): Logger {
    return new Logger(`${this.prefix}:${prefix}`, this.level);
  }
}

let globalLevel = LogLevel.INFO;

export function setLogLevel(level: LogLevel): void {
  globalLevel = level;
}

export function createLogger(prefix: string): Logger {
  return new Logger(prefix, globalLevel);
}
