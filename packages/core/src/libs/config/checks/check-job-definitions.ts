import { CronExpressionParser } from "cron-parser";
import { isJsonObject } from "../../../utils/helpers/is-json-object.js";
import { translate } from "../../i18n/index.js";
import {
	getJobDefinitionKey,
	getJobDefinitionRuntime,
} from "../../jobs/registry.js";
import type { AnyJobDefinition } from "../../jobs/types.js";

/** Checks job identities, retry policies, schedules and schedule input. */
const checkJobDefinitions = async (
	definitions: readonly AnyJobDefinition[],
) => {
	const definitionKeys = new Set<string>();

	for (const definition of definitions) {
		const definitionKey = getJobDefinitionKey(definition);
		if (definitionKeys.has(definitionKey)) {
			throw new Error(
				translate("server:core.config.job.definition.duplicate", {
					data: { definition: definitionKey },
				}),
			);
		}
		definitionKeys.add(definitionKey);

		if (!/^[a-z0-9][a-z0-9._-]*:[a-z0-9][a-z0-9._-]*$/.test(definition.name)) {
			throw new Error(
				translate("server:core.config.job.name.invalid", {
					data: { job: definition.name },
				}),
			);
		}
		if (!Number.isSafeInteger(definition.version) || definition.version < 1) {
			throw new Error(
				translate("server:core.config.job.version.invalid", {
					data: { job: definition.name },
				}),
			);
		}
		if (
			definition.retry.type === "exponential" &&
			(!Number.isSafeInteger(definition.retry.maxAttempts) ||
				definition.retry.maxAttempts < 1 ||
				!Number.isSafeInteger(definition.retry.baseDelayMs) ||
				definition.retry.baseDelayMs < 0 ||
				!Number.isSafeInteger(definition.retry.maxDelayMs) ||
				definition.retry.maxDelayMs < definition.retry.baseDelayMs)
		) {
			throw new Error(
				translate("server:core.config.job.retry.invalid", {
					data: { job: definition.name },
				}),
			);
		}

		const scheduleNames = new Set<string>();
		const runtime = getJobDefinitionRuntime(definition);
		for (const schedule of definition.schedules) {
			const scheduleKey = `${definition.name}/${schedule.name}`;
			if (!/^[a-z0-9][a-z0-9._-]*$/.test(schedule.name)) {
				throw new Error(
					translate("server:core.config.job.schedule.name.invalid", {
						data: { schedule: scheduleKey },
					}),
				);
			}
			if (scheduleNames.has(schedule.name)) {
				throw new Error(
					translate("server:core.config.job.schedule.duplicate", {
						data: { schedule: scheduleKey },
					}),
				);
			}
			scheduleNames.add(schedule.name);

			if (schedule.cron.split(/\s+/).length !== 5) {
				throw new Error(
					translate("server:core.config.job.schedule.cron.invalid", {
						data: { schedule: scheduleKey },
					}),
				);
			}
			if (!schedule.timezone) {
				throw new Error(
					translate("server:core.config.job.schedule.timezone.empty", {
						data: { schedule: scheduleKey },
					}),
				);
			}
			try {
				CronExpressionParser.parse(schedule.cron, {
					tz: schedule.timezone,
				}).next();
			} catch {
				throw new Error(
					translate("server:core.config.job.schedule.invalid", {
						data: { schedule: scheduleKey },
					}),
				);
			}
			if (schedule.input !== null && !isJsonObject(schedule.input)) {
				throw new Error(
					translate("server:core.config.job.schedule.json.invalid", {
						data: { schedule: scheduleKey },
					}),
				);
			}
			const parsed = await runtime.parse(schedule.input);
			if (!parsed.success) {
				throw new Error(
					translate("server:core.config.job.schedule.input.invalid", {
						data: { schedule: scheduleKey },
					}),
				);
			}
		}
	}
};

export default checkJobDefinitions;
