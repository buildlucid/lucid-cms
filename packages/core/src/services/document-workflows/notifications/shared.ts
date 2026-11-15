import z from "zod";
import type { NotificationReceivable } from "../../../libs/notifications/types.js";
import { getCollectionPermission } from "../../../libs/permission/collection-permissions.js";
import hasPermission from "../../../libs/permission/has-permission.js";
import getEditPath from "../../documents/helpers/get-edit-path.js";
import getRequestPath from "../../requests/helpers/get-request-path.js";

/** Data every workflow notification carries. */
export const workflowData = z.object({
	collectionKey: z.string(),
	documentId: z.number(),
	/** The open request that owns the proposal, when the workflow is not on latest. */
	requestId: z.number().nullable(),
	label: z.string().nullable(),
	stage: z.string(),
});

/** Links a workflow notification to the document, inside its request when it has one. */
export const workflowHref = (data: z.output<typeof workflowData>) =>
	data.requestId === null
		? getEditPath(data.collectionKey, "latest", data.documentId)
		: getRequestPath(data.requestId, data);

/** People who can be assigned a stage: those who update a collection with a workflow. */
export const receivesWorkflows: NotificationReceivable = ({ user, config }) =>
	config.collections.some(
		(collection) =>
			collection.getData.publishing.workflow !== undefined &&
			hasPermission(user, getCollectionPermission(collection.key, "update")),
	);
