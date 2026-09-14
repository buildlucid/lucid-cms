import z from "zod";
import defineJob from "../../../libs/jobs/define-job.js";
import type { JobHandler } from "../../../libs/jobs/types.js";
import { resolveEffectiveConnection } from "../storage.js";
import verifyConnection from "../verify.js";

const verifyConnections: JobHandler = async ({ context }) => {
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
	name: "core:verify-connection",
	version: 1,
	input: z.null(),
	schedules: [
		{
			name: "automatic",
			cron: "0 0 * * *",
			timezone: "UTC",
			input: null,
		},
	],
	handler: verifyConnections,
});
