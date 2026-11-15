import { notificationsFormatter } from "../../libs/formatters/index.js";
import {
	NotificationPreferencesRepository,
	NotificationTypeSettingsRepository,
} from "../../libs/repositories/index.js";
import type { LucidUser } from "../../types/hono.js";
import type { NotificationPreference } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";

/** The person's email choice for every type that is turned on and that they could receive. */
const getPreferences: ServiceFn<
	[{ user: LucidUser }],
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
			where: [{ key: "user_id", operator: "=", value: data.user.id }],
		}),
	]);
	if (settingsRes.error) return settingsRes;
	if (preferencesRes.error) return preferencesRes;

	return {
		error: undefined,
		data: notificationsFormatter.formatPreferences({
			definitions: context.config.notifications,
			user: {
				superAdmin: data.user.superAdmin,
				permissions: data.user.permissions ?? [],
			},
			config: context.config,
			settings: settingsRes.data ?? [],
			preferences: preferencesRes.data ?? [],
			translate: context.translate,
		}),
	};
};

export default getPreferences;
