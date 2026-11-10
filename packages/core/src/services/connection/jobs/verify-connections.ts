import z from "zod";
import defineJob from "../../../libs/jobs/define-job.js";
import type { JobService } from "../../../libs/jobs/types.js";
import { LucidError } from "../../../utils/errors/index.js";
import { resolveEffectiveConnection } from "../storage.js";
import verifyConnection from "../verify.js";

const verifyConnections: JobService = async ({ context }) => {
	const connection = await resolveEffectiveConnection(context);
	if (connection.error) return connection;

	if (connection.data?.grant_encrypted) {
		const result = await verifyConnection(context, {
			connection: connection.data,
		});
		if (result.error) return result;
	}

	return { error: undefined, data: undefined };
};

/** Revalidates the active connection grant. */
export const verifyConnectionsJob = defineJob({
	key: "core:verify-connection",
	version: 1,
	input: z.null(),
	schedules: [
		{
			key: "automatic",
			cron: "0 0 * * *",
			timezone: "UTC",
			input: null,
		},
	],
	handler: async (args) => {
		const result = await verifyConnections(args);
		if (result.error) throw new LucidError(result.error);
	},
});
