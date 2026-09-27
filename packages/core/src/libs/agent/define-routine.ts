import dedent from "../../utils/helpers/dedent.js";
import type { DefineRoutineOptions, RoutineDefinition } from "./types.js";

/**
 * Defines a scheduled routine that runs as the system. Edit its settings in
 * code; agent managers can pause, start and review its runs in the admin.
 */
const defineRoutine = <const Key extends string>(
	options: DefineRoutineOptions<Key>,
): RoutineDefinition<Key> => ({
	type: "routine-definition",
	key: options.key,
	name: options.name,
	instructions: dedent(options.instructions),
	model: options.model,
	//* unset settings are dropped so sync compares code and stored settings exactly
	tools: Object.fromEntries(
		Object.entries(options.tools ?? {}).map(([name, { requiresApproval }]) => [
			name,
			requiresApproval === undefined ? {} : { requiresApproval },
		]),
	),
	schedule: {
		cron: options.schedule.cron.trim().split(/\s+/).join(" "),
		timezone: (options.schedule.timezone ?? "UTC").trim(),
	},
});

export default defineRoutine;
