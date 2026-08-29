import z from "zod";
import { copy } from "../i18n/index.js";
import defineJob from "../queue/define-job.js";
import { jobPayloadSchema } from "../queue/schema.js";
import type { JobHandler } from "../queue/types.js";
import { getAlertConfig } from "./alert-map.js";

const input = z.object({
	key: z.string().min(1),
	source: z.enum(["cron", "programmatic"]).optional(),
	trigger: z.string().optional(),
	metadata: jobPayloadSchema.optional(),
});

/**
 * Runs a single alert producer resolved from the registered alert map.
 */
const executeAlert: JobHandler<z.infer<typeof input>> = async (
	context,
	data,
) => {
	const config = getAlertConfig(data.key);
	if (!config) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.alerts.unknown.key.message", {
					data: {
						key: data.key,
					},
				}),
				status: 400,
			},
			data: undefined,
		};
	}

	return config.service(context, data);
};

export const executeAlertJob = defineJob({
	name: "lucid:alert.execute",
	version: 1,
	input,
	handler: executeAlert,
	describe: ({ key, source, trigger }) => ({
		key,
		...(source ? { source } : {}),
		...(trigger ? { trigger } : {}),
	}),
});
