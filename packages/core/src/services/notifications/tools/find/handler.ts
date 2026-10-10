import type z from "zod";
import { copy } from "../../../../libs/i18n/index.js";
import type { ToolkitActor } from "../../../../libs/toolkit/types.js";
import { getPagination } from "../../../../libs/tools/pagination.js";
import { formatPerson } from "../../../../libs/tools/person.js";
import { getBaseUrl } from "../../../../utils/helpers/index.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import getMultiple from "../../get-multiple.js";
import type { inputSchema, outputSchema } from "./schema.js";

/** Lists the user's own notifications and rejects system actors, which have no inbox. */
const findNotifications: ServiceFn<
	[{ input: z.output<typeof inputSchema>; actor: ToolkitActor }],
	{ output: z.output<typeof outputSchema> }
> = async (context, props) => {
	const { query } = props.input;
	if (props.actor.kind !== "user") {
		return {
			error: {
				type: "basic",
				status: 403,
				message: copy("server:core.notifications.inbox.user.only"),
			},
			data: undefined,
		};
	}

	const notificationsRes = await getMultiple(context, {
		userId: props.actor.userId,
		query,
	});
	if (notificationsRes.error) return notificationsRes;

	const baseUrl = getBaseUrl(context);
	return {
		error: undefined,
		data: {
			output: {
				data: notificationsRes.data.data.map((notification) => ({
					id: notification.id,
					type: notification.type,
					category: notification.category.key,
					level: notification.level,
					actionRequired: notification.actionRequired,
					title: notification.title,
					body: notification.body,
					actor: notification.actor && formatPerson(notification.actor),
					actorAgent: notification.actorAgent?.name ?? null,
					readAt: notification.readAt,
					resolvedAt: notification.resolvedAt,
					createdAt: notification.createdAt,
					link: notification.href && new URL(notification.href, baseUrl).href,
				})),
				pagination: getPagination(
					notificationsRes.data.count,
					query.page,
					query.perPage,
				),
			},
		},
	};
};

export default findNotifications;
