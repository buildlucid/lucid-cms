import resolveTypeSettings from "../../../libs/notifications/resolve-type-settings.js";
import type { AnyNotificationDefinition } from "../../../libs/notifications/types.js";
import { NotificationTypeSettingsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** A type's effective settings: the stored row when an admin changed it, otherwise the definition's defaults. */
const getTypeSettings: ServiceFn<
	[{ definition: AnyNotificationDefinition }],
	{ enabled: boolean; email: boolean; roleIds: number[] | null }
> = async (context, data) => {
	const TypeSettings = new NotificationTypeSettingsRepository(context.db);

	const settingsRes = await TypeSettings.selectSingle({
		select: ["enabled", "email_enabled", "role_ids"],
		where: [{ key: "type", operator: "=", value: data.definition.key }],
	});
	if (settingsRes.error) return settingsRes;

	return {
		error: undefined,
		data: resolveTypeSettings({
			definition: data.definition,
			row: settingsRes.data,
		}),
	};
};

export default getTypeSettings;
