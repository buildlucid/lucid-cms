import type { ResolvedLucidConfig } from "../../../types/config.js";
import { translate } from "../../i18n/index.js";
import { getValidPermissions } from "../../permission/registry.js";

/** Checks notification keys are unique and well formed, audience permissions exist and email delays are valid. */
const checkNotificationDefinitions = (config: ResolvedLucidConfig) => {
	const keys = new Set<string>();
	const permissions = new Set(getValidPermissions(config));

	for (const definition of config.notifications.definitions) {
		if (keys.has(definition.key)) {
			throw new Error(
				translate("server:core.config.notification.definition.duplicate", {
					data: { definition: definition.key },
				}),
			);
		}
		keys.add(definition.key);

		if (!/^[a-z0-9][a-z0-9._-]*:[a-z0-9][a-z0-9._-]*$/.test(definition.key)) {
			throw new Error(
				translate("server:core.config.notification.key.invalid", {
					data: { definition: definition.key },
				}),
			);
		}

		if (
			definition.audience !== "recipients" &&
			!permissions.has(definition.audience.permission)
		) {
			throw new Error(
				translate("server:core.config.notification.permission.unknown", {
					data: {
						definition: definition.key,
						permission: definition.audience.permission,
					},
				}),
			);
		}

		if (
			!Number.isFinite(definition.email.delayMinutes) ||
			definition.email.delayMinutes < 0
		) {
			throw new Error(
				translate("server:core.config.notification.email.delay.invalid", {
					data: { definition: definition.key },
				}),
			);
		}
	}
};

export default checkNotificationDefinitions;
