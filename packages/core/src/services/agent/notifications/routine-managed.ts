import z from "zod";
import { copy } from "../../../libs/i18n/copy.js";
import { notificationCategories } from "../../../libs/notifications/categories.js";
import defineNotification from "../../../libs/notifications/define-notification.js";

/** Tells an owner that someone overseeing routines paused, resumed or deleted one of theirs. */
export const routineManagedNotification = defineNotification({
	key: "agent:routine-managed",
	category: notificationCategories.agent,
	name: copy("admin:core.notifications.agent.routine-managed.name", {
		defaultMessage: "Routine changed by an admin",
	}),
	description: copy(
		"admin:core.notifications.agent.routine-managed.description",
		{
			defaultMessage:
				"Someone who manages all routines pauses, resumes or deletes one of yours.",
		},
	),
	level: "info",
	audience: "recipients",
	defaults: { email: false },
	data: z.object({
		name: z.string(),
		action: z.enum(["paused", "resumed", "deleted"]),
	}),
	render: ({ data }) => {
		switch (data.action) {
			case "paused":
				return {
					title: copy(
						"server:core.notifications.agent.routine-managed.paused",
						{
							data: { name: data.name },
							defaultMessage: "{{name}} was paused",
						},
					),
					href: "/lucid/agent/routines",
				};
			case "resumed":
				return {
					title: copy(
						"server:core.notifications.agent.routine-managed.resumed",
						{
							data: { name: data.name },
							defaultMessage: "{{name}} was resumed",
						},
					),
					href: "/lucid/agent/routines",
				};
			case "deleted":
				return {
					title: copy(
						"server:core.notifications.agent.routine-managed.deleted",
						{
							data: { name: data.name },
							defaultMessage: "{{name}} was deleted",
						},
					),
					body: copy(
						"server:core.notifications.agent.routine-managed.deleted.body",
						{ defaultMessage: "Its past chats are kept." },
					),
				};
		}
	},
});
