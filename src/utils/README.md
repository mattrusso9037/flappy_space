# Logging Utility

This directory contains utilities for the Flappy Space game, including a structured logging system.

## Logger

The logging system is built on top of the lightweight [loglevel](https://github.com/pimterry/loglevel) library and provides:

- Multiple log levels (TRACE, DEBUG, INFO, WARN, ERROR, SILENT)
- Contextualized logging with module/component names
- Timestamps and formatting
- Configurable log levels based on environment

### Basic Usage

```typescript
// Import the default logger
import Logger from '../utils/logger';

// Use different log levels
Logger.trace('Very detailed information');
Logger.debug('Diagnostic information');
Logger.info('General information');
Logger.warn('Warning: something might be wrong');
Logger.error('Something has gone wrong', someErrorObject);
```

### Contextualized Logging

For component-specific logging:

```typescript
import { getLogger } from '../utils/logger';

// Create a contextualized logger for your component
const logger = getLogger('GameController');

// Now all logs will include the component name
logger.info('Game initialized'); // [INFO] [GameController] Game initialized
```

### Configuration

You can configure the logger at startup:

```typescript
import { initLogger, LogLevel } from '../utils/logger';

initLogger({
  level: process.env.NODE_ENV === 'production' ? LogLevel.ERROR : LogLevel.DEBUG,
  showTimestamp: true,
  showLogLevel: true
});
```

### Log Levels

Log levels from most to least verbose:

1. **TRACE**: Extremely detailed information
2. **DEBUG**: Diagnostic information for development
3. **INFO**: General information about application flow
4. **WARN**: Warning messages that don't prevent the application from working
5. **ERROR**: Error messages when something has gone wrong
6. **SILENT**: No logging at all

In production, it's recommended to use ERROR level only. For development, DEBUG or INFO is typically used.

## Helper Script

A helper script is available to assist in transitioning from `console.log` to our structured logger:

```bash
node scripts/replace-logs.js path/to/your/file.ts
```

This script will:
1. Add the logger import if needed
2. Replace console.log calls with appropriate logger methods
3. Remove component name prefixes from log messages

Always review the changes after running the script to ensure correctness. 