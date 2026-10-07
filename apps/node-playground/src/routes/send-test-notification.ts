import { defineRoute, notifications } from "@lucidcms/core";
import { deployFinishedNotification } from "../notifications/deploy-finished.js";

/**
 * Sends a playground deploy notification to everyone who can read settings,
 * plus a Lucid request notification to the given user, to try the inbox.
 */
const sendTestNotificationRoute = defineRoute({
	method: "post",
	path: "/send-test-notification",
	openAPI: {
		summary: "Send playground test notifications",
		description:
			"Sends a custom deploy notification and a core request notification via the Lucid toolkit.",
		tags: ["Playground"],
	},
	handler: async ({ hono, toolkit }) => {
		const success = Math.random() > 0.3;
		const deploy = await toolkit.notifications.upsert({
			type: deployFinishedNotification,
			key: "deploy:playground",
			fingerprint: success ? "ok" : "failed",
			data: {
				site: "Playground",
				success,
				durationSeconds: Math.round(20 + Math.random() * 40),
			},
		});
		if (deploy.error) {
			return hono.json({ error: deploy.error }, 500);
		}

		const userId = Number(hono.req.query("userId") ?? 1);
		const review = await toolkit.notifications.send({
			type: notifications.requests.reviewRequested,
			key: `playground:review:${userId}`,
			recipients: [userId],
			data: { requestId: 1, title: "Playground launch" },
		});
		if (review.error) {
			return hono.json({ error: review.error }, 500);
		}

		return hono.json({ data: { deploy: deploy.data, review: review.data } });
	},
});

export default sendTestNotificationRoute;
