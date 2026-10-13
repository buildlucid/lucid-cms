import type { User } from "../../exports/types.js";
import { usersFormatter } from "../../libs/formatters/index.js";
import { copy } from "../../libs/i18n/index.js";
import {
	EmailChangeRequestsRepository,
	UserPreferencesRepository,
	UsersRepository,
} from "../../libs/repositories/index.js";
import type { LucidAuth } from "../../types/hono.js";
import { getBaseUrl } from "../../utils/helpers/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import parseUserPreferences from "./helpers/parse-user-preferences.js";

const getAuthenticatedUser: ServiceFn<
	[
		{
			userId: number;
			authUser: LucidAuth;
		},
	],
	User
> = async (context, data) => {
	const Users = new UsersRepository(context.db);
	const EmailChangeRequests = new EmailChangeRequestsRepository(context.db);
	const Preferences = new UserPreferencesRepository(context.db);

	const [userRes, pendingEmailChangeRes, preferencesRes] = await Promise.all([
		Users.selectSinglePreset({
			where: [
				{
					key: "id",
					operator: "=",
					value: data.userId,
				},
				{
					key: "is_deleted",
					operator: "=",
					value: context.config.db.getDefault("boolean", "false"),
				},
			],
			validation: {
				enabled: true,
				defaultError: {
					message: copy("server:core.user.not.found.message"),
					status: 404,
				},
			},
		}),
		EmailChangeRequests.selectActivePendingForUser({
			userId: data.userId,
		}),
		Preferences.selectSingle({
			select: ["preferences"],
			where: [{ key: "user_id", operator: "=", value: data.userId }],
		}),
	]);
	if (userRes.error) return userRes;
	if (pendingEmailChangeRes.error) return pendingEmailChangeRes;
	if (preferencesRes.error) return preferencesRes;

	return {
		error: undefined,
		data: usersFormatter.formatSingle({
			user: userRes.data,
			authUser: data.authUser,
			mediaOptions: {
				host: getBaseUrl(context),
				delivery: context.mediaDelivery,
				defaultLocale: context.config.localization.defaultLocale,
				locales: context.config.localization.locales,
			},
			pendingEmailChange: pendingEmailChangeRes.data
				? {
						email: pendingEmailChangeRes.data.new_email,
						requestedAt: pendingEmailChangeRes.data.created_at,
						expiresAt: pendingEmailChangeRes.data.expires_at,
					}
				: null,
			preferences: parseUserPreferences(preferencesRes.data?.preferences),
		}),
	};
};

export default getAuthenticatedUser;
