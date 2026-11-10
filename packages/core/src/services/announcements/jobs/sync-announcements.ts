import z from "zod";
import defineJob from "../../../libs/jobs/define-job.js";
import { LucidError } from "../../../utils/errors/index.js";
import syncAnnouncements from "../sync.js";

/** Checks announcements every 6 hours. Network failures do not trigger failure notifications. */
export const syncAnnouncementsJob = defineJob({
	key: "core:sync-announcements",
	version: 1,
	input: z.null(),
	notifyOnFailure: false,
	schedules: [
		{
			key: "automatic",
			cron: "0 */6 * * *",
			timezone: "UTC",
			input: null,
		},
	],
	handler: async ({ context }) => {
		const result = await syncAnnouncements(context);
		if (result.error) throw new LucidError(result.error);
	},
});
