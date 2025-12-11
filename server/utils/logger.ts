/**
 * Custom logger with colored output and timestamps
 */

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function getTimestamp(): string {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

export const logger = {
  info: (message: string, ...args: any[]) => {
    console.log(`${colors.gray}[${getTimestamp()}]${colors.reset} ${colors.cyan}ℹ${colors.reset} ${message}`, ...args);
  },

  success: (message: string, ...args: any[]) => {
    console.log(`${colors.gray}[${getTimestamp()}]${colors.reset} ${colors.green}✓${colors.reset} ${message}`, ...args);
  },

  warn: (message: string, ...args: any[]) => {
    console.warn(`${colors.gray}[${getTimestamp()}]${colors.reset} ${colors.yellow}⚠${colors.reset} ${message}`, ...args);
  },

  error: (message: string, error?: any) => {
    console.error(`${colors.gray}[${getTimestamp()}]${colors.reset} ${colors.red}✖${colors.reset} ${message}`);
    if (error) {
      console.error(colors.red, error, colors.reset);
    }
  },

  debug: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`${colors.gray}[${getTimestamp()}]${colors.reset} ${colors.magenta}🐛${colors.reset} ${message}`, ...args);
    }
  },

  api: (method: string, path: string, status: number, duration?: number) => {
    const statusColor = status >= 500 ? colors.red : status >= 400 ? colors.yellow : colors.green;
    const durationStr = duration ? ` ${colors.gray}(${duration}ms)${colors.reset}` : '';
    console.log(
      `${colors.gray}[${getTimestamp()}]${colors.reset} ${colors.blue}${method}${colors.reset} ${path} ${statusColor}${status}${colors.reset}${durationStr}`
    );
  },
};
