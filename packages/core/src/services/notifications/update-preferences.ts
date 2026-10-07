import { copy } from "../../libs/i18n/index.js";
import { getNotificationDefinition } from "../../libs/notifications/registry.js";
import { NotificationPreferencesRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const updatePreferences: ServiceFn<
	[
		{
			userId: number;
			preferences: Array<{ type: string; email: boolean }>;
		},
	],
	undefined
> = async (context, data) => {
	if (data.preferences.length === 0) {
		return { error: undefined, data: undefined };
	}

	for (const preference of data.preferences) {
		if (!getNotificationDefinition(context.config, preference.type)) {
			return {
				error: {
					type: "basic",
					message: copy("server:core.notifications.type.not.found"),
					status: 404,
				},
				data: undefined,
			};
		}
	}

	const Preferences = new NotificationPreferencesRepository(context.db);
	const upsertRes = await Preferences.upsertMultiple({
		data: data.preferences.map((preference) => ({
			user_id: data.userId,
			type: preference.type,
			email_enabled: preference.email,
		})),
	});
	if (upsertRes.error) return upsertRes;

	return { error: undefined, data: undefined };
};

export default updatePreferences;
