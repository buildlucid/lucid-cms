import z from "zod";

/** What Lucid sent. Notifications render from it, and only refresh when it changes. */
export const announcementNotificationData = z.object({
	title: z.string(),
	message: z.string(),
	url: z.string().nullable(),
});
