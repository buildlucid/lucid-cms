import { defineNotification, z } from "@lucidcms/core";

/** A custom notification type, sent from the playground's test route. */
export const deployFinishedNotification = defineNotification({
	key: "playground:deploy-finished",
	category: { key: "playground", label: "Playground" },
	name: "Deploy finished",
	description: "A site deploy finished, successfully or not.",
	actionRequired: true,
	audience: { permission: "settings:read" },
	data: z.object({
		site: z.string(),
		success: z.boolean(),
		durationSeconds: z.number(),
	}),
	render: ({ data }) => ({
		level: data.success ? "success" : "error",
		title: data.success
			? `${data.site} deployed`
			: `${data.site} failed to deploy`,
		body: `The deploy took ${data.durationSeconds} seconds.`,
		href: "/lucid/system/overview",
	}),
});
