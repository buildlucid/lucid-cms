import dedent from "../../utils/helpers/dedent.js";
import type { DefineRoutineOptions, RoutineDefinition } from "./types.js";

/**
 * Defines a scheduled routine for an agent. Routines defined in code run as the
 * system and can only be paused or run early from the admin.
 */
const defineRoutine = <const Key extends string>(
	options: DefineRoutineOptions<Key>,
): RoutineDefinition<Key> => ({
	type: "routine-definition",
	key: options.key,
	name: options.name,
	instructions: dedent(options.instructions),
	schedule: {
		cron: options.schedule.cron.trim().split(/\s+/).join(" "),
		timezone: (options.schedule.timezone ?? "UTC").trim(),
	},
});

export default defineRoutine;
