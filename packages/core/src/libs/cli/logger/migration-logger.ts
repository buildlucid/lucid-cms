import { colours, divider, formatBadge, formatDuration } from "./helpers.js";
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
}

const createMigrationLogger = (): MigrationLogger => ({
	migrationStart: () => {
		console.log(`\n${divider}\n`);
		console.log(
			`${formatBadge("MIGRATE", colours.bgBlue, colours.textBlue)} Checking migration status...`,
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
			"\n👋 Exiting without running migrations. Run this command again when you're ready.",
		);
		console.log(`\n${divider}\n`);
	},
	logsStart: () => {
		console.log("\n✏️ Migration logs:");
	},
	dbMigrationStart: () => {
		console.log(
			`${colours.textGray}  - Running database schema migrations...${colours.reset}`,
		);
	},
	dbMigrationComplete: () => {
		console.log(
			`${colours.textGray}  - Database schema migrations completed ${colours.bold}successfully${colours.reset}`,
		);
	},
	syncTasksStart: () => {
		console.log(
			`${colours.textGray}  - Running sync tasks (locales, collections)...${colours.reset}`,
		);
	},
	syncTasksComplete: () => {
		console.log(
			`${colours.textGray}  - Sync tasks completed ${colours.bold}successfully${colours.reset}`,
		);
	},
	collectionMigrationStart: () => {
		console.log(
			`${colours.textGray}  - Running collection migrations...${colours.reset}`,
		);
	},
	collectionMigrationComplete: () => {
		console.log(
			`${colours.textGray}  - Collection migrations completed ${colours.bold}successfully${colours.reset}`,
		);
	},
	migrationComplete: (startTime: [number, number]) => {
		const diff = process.hrtime(startTime);
		const milliseconds = diff[0] * 1000 + diff[1] / 1000000;
		console.log(
			`\n${formatBadge("READY", colours.bgLimeGreen, colours.textGreen)} Migration completed ${colours.textGreen}successfully${colours.reset} in ${formatDuration(milliseconds)}\n`,
		);
	},
	migrationFailed: (error: unknown, step?: string) => {
		const stepMessage = step ? ` during ${step}` : "";
		console.error(`\n❌ Migration failed${stepMessage}:`, error);
		console.log(`\n${divider}\n`);
	},
	...sharedLogger(),
});

export default createMigrationLogger;
