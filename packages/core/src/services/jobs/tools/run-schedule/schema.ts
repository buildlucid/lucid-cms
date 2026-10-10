import z from "zod";
import { controllerSchemas } from "../../../../schemas/jobs.js";

export const inputSchema = z.object({
	scheduleKey: z.string().trim().min(1).meta({
		description: "Schedule key, eg. from jobs_list_schedules.",
	}),
});

export const outputSchema = z.object({
	job: controllerSchemas.triggerSchedule.response.meta({
		description: "The queued job. Follow it with jobs_get.",
	}),
});
