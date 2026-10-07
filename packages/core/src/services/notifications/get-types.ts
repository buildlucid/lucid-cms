import { notificationsFormatter } from "../../libs/formatters/index.js";
import { NotificationTypeSettingsRepository } from "../../libs/repositories/index.js";
import type { NotificationType } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";

/** Every registered type with its current settings, for the settings page. */
const getTypes: ServiceFn<[], NotificationType[]> = async (context) => {
	const TypeSettings = new NotificationTypeSettingsRepository(context.db);

	const settingsRes = await TypeSettings.selectMultiple({
		select: ["type", "enabled", "email_enabled", "role_ids"],
	});
	if (settingsRes.error) return settingsRes;

	return {
		error: undefined,
		data: notificationsFormatter.formatTypes({
			definitions: context.config.notifications,
			settings: settingsRes.data ?? [],
			translate: context.translate,
		}),
	};
};

export default getTypes;
