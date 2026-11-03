import constants from "../../constants/constants.js";
import type { ResolvedLucidConfig } from "../../types/config.js";
import type { AnyNotificationDefinition } from "./types.js";

/**
 * Resolves templates in order: `notifications/<namespace>/<name>`, the type's `email.template`,
 * then Lucid's default.
 */
const getEmailTemplate = (
	config: Pick<ResolvedLucidConfig, "email">,
	definition: AnyNotificationDefinition,
) => {
	const override = `${constants.notifications.emailTemplateDirectory}/${definition.key.replace(":", "/")}`;
	if (config.email.templates?.[override] !== undefined) return override;

	return (
		definition.email.template ?? constants.email.templates.notification.key
	);
};

export default getEmailTemplate;
