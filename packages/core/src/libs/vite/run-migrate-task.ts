import cliLogger from "../cli/logger.js";
import type { RuntimeTaskInput } from "../runtime/tasks/index.js";
import type { RuntimeTaskClient } from "./create-task-client.js";
import requestMigrationApproval from "./request-migration-approval.js";

/** Runs runtime migrations, requesting terminal approval and resubmitting without repeating approved plans, returning declined when approval is refused or `signal` closes the prompt. */
const runMigrateTask = async (
	run: RuntimeTaskClient,
	options: RuntimeTaskInput<"migrate"> = {},
	signal?: AbortSignal,
) => {
	let input = options;

	while (true) {
		const result = await run("migrate", input);
		if (result.status !== "declined") return result;

		// `--yes` approves warnings only, so the destructive gate it rejects stays rejected. Approving a warning here
		// sends `yes` too, so a destructive gate after it is asked about instead.
		const gate =
			result.gate === "reject-destructive" && !options.yes
				? "prompt-destructive"
				: result.gate;
		if (!(await requestMigrationApproval(gate, signal))) {
			if (gate !== "reject-destructive" && !signal?.aborted) {
				cliLogger.info("The remaining migrations didn't run.");
			}
			return { status: "declined", gate } as const;
		}

		input =
			gate === "prompt-destructive"
				? { ...input, allowDestructive: true, planShown: true }
				: { ...input, yes: true, planShown: true };
	}
};

export default runMigrateTask;
