import dedent from "../../utils/helpers/dedent.js";
import type { DefineRoutineOptions, RoutineDefinition } from "./types.js";

/**
 * Defines a scheduled system routine with settings managed in code.
 * @remarks Agent managers can pause, start and review runs in the admin.
 * Runs never wait for a person; tools needing confirmation are refused unless overridden with `requiresConfirmation: false`.
 */
const defineRoutine = <const Key extends string>(
	options: DefineRoutineOptions<Key>,
): RoutineDefinition<Key> => ({
	type: "routine-definition",
	key: options.key,
	name: options.name,
	instructions: dedent(options.instructions),
	conversationMode: options.conversationMode ?? "new",
	model: options.model,
	//* unset settings are dropped so sync compares code and stored settings exactly
	toolSettings: Object.fromEntries(
		Object.entries(options.toolSettings ?? {}).map(
			([name, { requiresConfirmation }]) => [
				name,
				requiresConfirmation === undefined ? {} : { requiresConfirmation },
			],
		),
	),
	schedule: {
		cron: options.schedule.cron.trim().split(/\s+/).join(" "),
		timezone: (options.schedule.timezone ?? "UTC").trim(),
	},
});

export default defineRoutine;
