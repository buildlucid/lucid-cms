import { colours, divider, formatBadge, formatDuration } from "./helpers.js";
import sharedLogger, { type SharedLogger } from "./shared-logger.js";

export interface MigrationLogger {
	migrationComplete: (startTime: [number, number]) => void;
}

const createMigrationLogger = (): MigrationLogger => ({
	migrationComplete: (startTime: [number, number]) => {
		const diff = process.hrtime(startTime);
		const milliseconds = diff[0] * 1000 + diff[1] / 1000000;
		console.log(
			`\n${formatBadge("DB", colours.bgLimeGreen, colours.textGreen)} Migration completed ${colours.textGreen}successfully${colours.reset} in ${formatDuration(milliseconds)}\n`,
		);
	},
});

export default createMigrationLogger;
