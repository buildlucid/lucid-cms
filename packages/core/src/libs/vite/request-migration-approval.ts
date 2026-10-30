import confirm from "@inquirer/confirm";
import cliLogger from "../cli/logger.js";
import runPrompt from "../cli/services/run-prompt.js";
import type { MigrationApprovalGate } from "../runtime/tasks/run-migrations.js";

/** Requests interactive migration approval, declining without a terminal or once `signal` aborts, and reporting how to review migrations or resolve non-interactive policy errors. */
const requestMigrationApproval = async (
	gate: MigrationApprovalGate,
	signal?: AbortSignal,
): Promise<boolean> => {
	if (gate === "reject-destructive") {
		cliLogger.error(
			"--yes does not authorize destructive collection migrations. Re-run with --allow-destructive if you accept the risk of permanent data loss.",
		);
		return false;
	}

	if (!process.stdin.isTTY) {
		cliLogger.warn(
			"These migrations need review, and there's no terminal to ask in. Run `lucidcms migrate` to review and run them.",
		);
		return false;
	}

	const destructive = gate === "prompt-destructive";

	try {
		return await runPrompt((output) =>
			confirm(
				{
					message: destructive
						? "These collection migrations may permanently delete stored data. Do you want to continue?"
						: "These migrations require review. Do you want to continue?",
					default: false,
				},
				{ output, signal },
			),
		);
	} catch (error) {
		if (
			error instanceof Error &&
			(error.name === "ExitPromptError" || error.name === "AbortPromptError")
		) {
			return false;
		}

		throw error;
	}
};

export default requestMigrationApproval;
