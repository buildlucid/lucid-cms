import type { ResolvedLucidConfig } from "../../types/config.js";
import type { AnyNotificationDefinition } from "./types.js";

export const isNotificationDefinition = (
	value: unknown,
): value is AnyNotificationDefinition =>
	typeof value === "object" &&
	value !== null &&
	"type" in value &&
	value.type === "notification-definition";

export const getNotificationDefinition = (
	config: Pick<ResolvedLucidConfig, "notifications">,
	key: string,
) => config.notifications.find((definition) => definition.key === key);
