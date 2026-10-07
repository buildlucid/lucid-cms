import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import type {
	AnyNotificationDefinition,
	NotificationReceipt,
} from "../../notifications/types.js";
import resolve from "./resolve/index.js";
import send from "./send/index.js";
import type {
	ToolkitNotificationsResolveInput,
	ToolkitNotificationsSendInput,
	ToolkitNotificationsUpsertInput,
} from "./types.js";
import upsert from "./upsert/index.js";

export type * from "./types.js";

/** Helpers for sending in-app and email notifications. */
export type ToolkitNotifications = {
	/** Sends a notification. With a key, an open match is left alone and a resolved one is reopened. */
	send: <Definition extends AnyNotificationDefinition>(
		input: ToolkitNotificationsSendInput<Definition>,
	) => ServiceResponse<NotificationReceipt>;
	/** Sends a notification, or refreshes the open one with the same key. People are told again when the fingerprint changes. */
	upsert: <Definition extends AnyNotificationDefinition>(
		input: ToolkitNotificationsUpsertInput<Definition>,
	) => ServiceResponse<NotificationReceipt>;
	/** Marks the open notification with this key as dealt with. */
	resolve: <Definition extends AnyNotificationDefinition>(
		input: ToolkitNotificationsResolveInput<Definition>,
	) => ServiceResponse<undefined>;
};

export const createNotificationsToolkit = (
	context: ServiceContext,
): ToolkitNotifications => ({
	send: (input) => send(context, input),
	upsert: (input) => upsert(context, input),
	resolve: (input) => resolve(context, input),
});

export default createNotificationsToolkit;
