import { colors, divider, formatBadge, formatDuration } from "./helpers.js";
import sharedLogger, { type SharedLogger } from "./shared-logger.js";

export interface MigrationLogger extends SharedLogger {
	migrationStart: () => void;
	migrationCheckStatus: (
		hasDbMigrations: boolean,
		hasCollectionMigrations: boolean,
	) => void;
	migrationSkipped: () => void;
	logsStart: () => void;
	dbMigrationStart: () => void;
	dbMigrationComplete: () => void;
	syncTasksStart: () => void;
	syncTasksComplete: () => void;
	collectionMigrationStart: () => void;
	collectionMigrationComplete: () => void;
	migrationComplete: (startTime: [number, number]) => void;
	migrationFailed: (error: unknown, step?: string) => void;
	clearingKVCache: () => void;
}

const createMigrationLogger = (): MigrationLogger => ({
	migrationStart: () => {
		console.log(`\n${divider}\n`);
		console.log(
			`${formatBadge("MIGRATE", colors.bgBlue, colors.textBlue)} Checking migration status...`,
		);
	},
	migrationCheckStatus: (
		hasDbMigrations: boolean,
		hasCollectionMigrations: boolean,
	) => {
		console.log("\n🔍 Migration status:");
		if (hasDbMigrations) {
			console.log("  • Database schema migrations are pending");
		}
		if (hasCollectionMigrations) {
			console.log("  • Collection/brick table migrations are needed");
		}
		if (!hasDbMigrations && !hasCollectionMigrations) {
			console.log("  • No migrations required");
		}
	},
	migrationSkipped: () => {
		console.log(
			"\n👋 Exiting without running migrations. Run this command again when you're ready.\n",
		);
	},
	logsStart: () => {
		console.log("\n✏️ Migration logs:");
	},
	dbMigrationStart: () => {
		console.log(
			`${colors.textGray}  - Running database schema migrations...${colors.reset}`,
		);
	},
	dbMigrationComplete: () => {
		console.log(
			`${colors.textGray}  - Database schema migrations completed ${colors.bold}successfully${colors.reset}`,
		);
	},
	syncTasksStart: () => {
		console.log(
			`${colors.textGray}  - Running sync tasks (locales, collections)...${colors.reset}`,
		);
	},
	syncTasksComplete: () => {
		console.log(
			`${colors.textGray}  - Sync tasks completed ${colors.bold}successfully${colors.reset}`,
		);
	},
	collectionMigrationStart: () => {
		console.log(
			`${colors.textGray}  - Running collection migrations...${colors.reset}`,
		);
	},
	collectionMigrationComplete: () => {
		console.log(
			`${colors.textGray}  - Collection migrations completed ${colors.bold}successfully${colors.reset}`,
		);
	},
	migrationComplete: (startTime: [number, number]) => {
		const diff = process.hrtime(startTime);
		const milliseconds = diff[0] * 1000 + diff[1] / 1000000;
		console.log(
			`\n${formatBadge("READY", colors.bgLimeGreen, colors.textGreen)} Migration completed ${colors.textGreen}successfully${colors.reset} in ${formatDuration(milliseconds)}\n`,
		);
	},
	migrationFailed: (error: unknown, step?: string) => {
		const stepMessage = step ? ` during ${step}` : "";
		console.error(
			`\n${colors.textRed}Migration failed${stepMessage}:${colors.reset}`,
			error,
		);
	},
	clearingKVCache: () => {
		console.log(`${colors.textGray}  - Clearing KV cache...${colors.reset}`);
	},
	...sharedLogger(),
});

export default createMigrationLogger;
