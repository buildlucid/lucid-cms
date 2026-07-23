import { confirm } from "@inquirer/prompts";
import {
	startLoggerBuffering,
	stopLoggerBuffering,
} from "../../logger/index.js";
import cliLogger from "../logger.js";
import migrateCommand from "./migrate.js";
import migrateResetCommand from "./migrate-reset.js";

const migrateFreshCommand = async (options?: {
	force?: boolean;
	remote?: boolean;
}) => {
	try {
		startLoggerBuffering();
		const startTime = cliLogger.startTimer();
		const force = options?.force ?? false;

		cliLogger.warn(
			"This will drop all database tables and re-run all migrations",
		);

		if (!force) {
			let shouldProceed: boolean;
			try {
				shouldProceed = await confirm({
					message:
						"Are you sure you want to fresh migrate the database? This will drop ALL tables and re-run migrations. This action cannot be undone.",
					default: false,
				});
			} catch (error) {
				if (error instanceof Error && error.name === "ExitPromptError") {
					await stopLoggerBuffering();
					process.exit(0);
				}
				throw error;
			}

			if (!shouldProceed) {
				cliLogger.info("Fresh migration cancelled");
				await stopLoggerBuffering();
				process.exit(0);
			}
		}

		const resetResult = await migrateResetCommand({ mode: "return" })({
			force: true,
		});
		if (!resetResult) {
			await stopLoggerBuffering();
			process.exit(1);
		}

		const migrateResult = await migrateCommand({ mode: "return" })({
			skipSyncSteps: false,
			skipEnvValidation: true,
			allowDestructive: true,
		});
		if (!migrateResult) {
			await stopLoggerBuffering();
			process.exit(1);
		}

		const endTime = startTime();
		cliLogger.log(
			cliLogger.createBadge("LUCID CMS"),
			"Fresh migration completed",
			cliLogger.color.green("successfully"),
			"in",
			cliLogger.color.green(cliLogger.formatMilliseconds(endTime)),
			{
				spaceAfter: true,
				spaceBefore: true,
			},
		);

		await stopLoggerBuffering();
		process.exit(0);
	} catch (error) {
		cliLogger.error(
			"Fresh migration failed",
			error instanceof Error ? error.message : "Unknown error",
		);
		if (error instanceof Error) cliLogger.errorInstance(error);
		await stopLoggerBuffering();
		process.exit(1);
	}
};

export default migrateFreshCommand;
