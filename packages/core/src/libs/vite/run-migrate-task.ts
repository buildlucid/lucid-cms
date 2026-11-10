import cliLogger from "../cli/logger.js";
import type { RuntimeTaskInput } from "../runtime/tasks/index.js";
import type { RuntimeTaskClient } from "./create-task-client.js";
import requestMigrationApproval from "./request-migration-approval.js";

/**
 * Runs migrations without repeating approved plans. Returns declined for refusal or abort;
 * `unanswered` marks unavailable approval, which commands treat as failure.
 */
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
		const approval = await requestMigrationApproval(gate, signal);
		if (approval !== "approved") {
			if (approval === "declined" && !signal?.aborted) {
				cliLogger.info("The remaining migrations didn't run.");
			}
			return {
				status: "declined",
				gate,
				unanswered: approval === "unanswered",
			} as const;
		}

		input =
			gate === "prompt-destructive"
				? { ...input, allowDestructive: true, planShown: true }
				: { ...input, yes: true, planShown: true };
	}
};

export default runMigrateTask;
