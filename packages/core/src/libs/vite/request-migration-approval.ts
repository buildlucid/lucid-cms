import confirm from "@inquirer/confirm";
import cliLogger from "../cli/logger.js";
import runPrompt from "../cli/services/run-prompt.js";
import type { MigrationApprovalGate } from "../runtime/tasks/run-migrations.js";

/** A person's answer, or `unanswered` when there was nobody to ask. */
export type MigrationApproval = "approved" | "declined" | "unanswered";

/**
 * Requests terminal approval. Returns `unanswered` for policy rejection or no terminal, and
 * `declined` for refusal, dismissal or abort.
 */
const requestMigrationApproval = async (
	gate: MigrationApprovalGate,
	signal?: AbortSignal,
): Promise<MigrationApproval> => {
	if (gate === "reject-destructive") {
		cliLogger.error(
			"--yes does not authorize destructive collection migrations. Re-run with --allow-destructive if you accept the risk of permanent data loss.",
		);
		return "unanswered";
	}

	const destructive = gate === "prompt-destructive";

	if (!process.stdin.isTTY) {
		cliLogger.error(
			destructive
				? "These collection migrations may permanently delete stored data, and there's no terminal to ask in. Run `lucidcms migrate --allow-destructive` if you accept the risk of permanent data loss."
				: "These migrations need review, and there's no terminal to ask in. Run `lucidcms migrate --yes` to accept them.",
		);
		return "unanswered";
	}

	try {
		const approved = await runPrompt((output) =>
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
		return approved ? "approved" : "declined";
	} catch (error) {
		if (
			error instanceof Error &&
			(error.name === "ExitPromptError" || error.name === "AbortPromptError")
		) {
			return "declined";
		}

		throw error;
	}
};

export default requestMigrationApproval;
