import z from "zod";
import type { NotificationReceivable } from "../../../libs/notifications/types.js";
import {
	getCollectionPermission,
	requestableActions,
} from "../../../libs/permission/collection-permissions.js";
import { Permissions } from "../../../libs/permission/definitions.js";
import hasPermission from "../../../libs/permission/has-permission.js";

/** Data every request notification carries. */
export const requestData = z.object({
	requestId: z.number(),
	title: z.string(),
});

const requestActions = [
	...requestableActions.flatMap((action) => [
		action,
		`${action}-request` as const,
	]),
	"review" as const,
];

/** People who read every request, or make, review or complete them in a collection they can read. */
export const receivesRequests: NotificationReceivable = ({ user, config }) =>
	hasPermission(user, Permissions.RequestsRead) ||
	config.collections.some(
		(collection) =>
			hasPermission(user, getCollectionPermission(collection.key, "read")) &&
			requestActions.some((action) =>
				hasPermission(user, getCollectionPermission(collection.key, action)),
			),
	);
