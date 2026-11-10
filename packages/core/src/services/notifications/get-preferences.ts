import { notificationsFormatter } from "../../libs/formatters/index.js";
import {
	NotificationPreferencesRepository,
	NotificationTypeSettingsRepository,
} from "../../libs/repositories/index.js";
import type { NotificationPreference } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";

/** The person's email choice for every type that is turned on. */
const getPreferences: ServiceFn<
	[{ userId: number }],
	NotificationPreference[]
> = async (context, data) => {
	const TypeSettings = new NotificationTypeSettingsRepository(context.db);
	const Preferences = new NotificationPreferencesRepository(context.db);

	const [settingsRes, preferencesRes] = await Promise.all([
		TypeSettings.selectMultiple({
			select: ["type", "enabled", "email_enabled", "role_ids"],
		}),
		Preferences.selectMultiple({
			select: ["type", "email_enabled"],
			where: [{ key: "user_id", operator: "=", value: data.userId }],
		}),
	]);
	if (settingsRes.error) return settingsRes;
	if (preferencesRes.error) return preferencesRes;

	return {
		error: undefined,
		data: notificationsFormatter.formatPreferences({
			definitions: context.config.notifications,
			settings: settingsRes.data ?? [],
			preferences: preferencesRes.data ?? [],
			translate: context.translate,
		}),
	};
};

export default getPreferences;
