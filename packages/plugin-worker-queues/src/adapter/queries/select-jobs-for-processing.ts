import { z } from "@lucidcms/core";
import type { LucidDatabase } from "@lucidcms/core/db";
import type { QueueEvent } from "@lucidcms/core/types";

const readyQueueJobSchema = z.object({
	job_id: z.string(),
	event_type: z.custom<QueueEvent>(
		(value) => typeof value === "string" && value.length > 0,
	),
	event_data: z.record(z.string(), z.unknown()),
	attempts: z.number(),
	max_attempts: z.number(),
});

/** Fetches the next queue batch using Lucid's managed Kysely boundary. */
const selectJobsForProcessing = (
	database: LucidDatabase,
	props: { limit: number; currentTime: Date },
) => {
	const currentTime = props.currentTime.toISOString();

	return database
		.query("queue.jobs.ready.find", (db) =>
			db
				.selectFrom("lucid_queue_jobs")
				.select([
					"job_id",
					"event_type",
					"event_data",
					"attempts",
					"max_attempts",
				])
				.where((eb) =>
					eb.and([
						eb("status", "=", "pending"),
						eb.or([
							eb("next_retry_at", "is", null),
							eb("next_retry_at", "<=", currentTime),
						]),
						eb.or([
							eb("scheduled_for", "is", null),
							eb("scheduled_for", "<=", currentTime),
						]),
					]),
				)
				.orderBy("priority", "desc")
				.orderBy("created_at", "asc")
				.limit(props.limit),
		)
		.many({ schema: readyQueueJobSchema });
};

export default selectJobsForProcessing;
