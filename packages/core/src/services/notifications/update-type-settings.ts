import { copy } from "../../libs/i18n/index.js";
import { getNotificationDefinition } from "../../libs/notifications/registry.js";
import { NotificationTypeSettingsRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import checkRolesExist from "../users/checks/check-roles-exist.js";

/** Turns a type on or off, toggles its emails and, for audience types, picks the roles that receive it. */
const updateTypeSettings: ServiceFn<
	[
		{
			type: string;
			enabled: boolean;
			email: boolean;
			roleIds: number[] | null;
			userId: number;
		},
	],
	undefined
> = async (context, data) => {
	const definition = getNotificationDefinition(context.config, data.type);
	if (!definition) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.notifications.type.not.found"),
				status: 404,
			},
			data: undefined,
		};
	}

	const roleIds =
		definition.audience === "recipients" || data.roleIds === null
			? null
			: [...new Set(data.roleIds)];
	if (roleIds !== null) {
		const rolesRes = await checkRolesExist(context, { roleIds });
		if (rolesRes.error) return rolesRes;
	}

	const TypeSettings = new NotificationTypeSettingsRepository(context.db);
	const upsertRes = await TypeSettings.upsertSingle({
		data: {
			type: definition.key,
			enabled: definition.required || data.enabled,
			email_enabled: data.email,
			role_ids: roleIds,
			updated_by: data.userId,
			updated_at: new Date().toISOString(),
		},
	});
	if (upsertRes.error) return upsertRes;

	return { error: undefined, data: undefined };
};

export default updateTypeSettings;
