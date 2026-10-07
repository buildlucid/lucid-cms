import { translate } from "../../i18n/index.js";
import type { AnyNotificationDefinition } from "../../notifications/types.js";

/** Checks notification keys are unique and well formed. */
const checkNotificationDefinitions = (
	definitions: readonly AnyNotificationDefinition[],
) => {
	const keys = new Set<string>();

	for (const definition of definitions) {
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
	}
};

export default checkNotificationDefinitions;
