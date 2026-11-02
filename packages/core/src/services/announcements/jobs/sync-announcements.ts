import z from "zod";
import defineJob from "../../../libs/jobs/define-job.js";
import syncAnnouncements from "../sync.js";

/** Checks announcements every 6 hours. Network failures do not trigger failure notifications. */
export const syncAnnouncementsJob = defineJob({
	name: "core:sync-announcements",
	version: 1,
	input: z.null(),
	notifyOnFailure: false,
	schedules: [
		{
			name: "automatic",
			cron: "0 */6 * * *",
			timezone: "UTC",
			input: null,
		},
	],
	handler: ({ context }) => syncAnnouncements(context),
});
