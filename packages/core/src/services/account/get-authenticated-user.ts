import { usersFormatter } from "../../libs/formatters/index.js";
import {
	EmailChangeRequestsRepository,
	UsersRepository,
} from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import type { LucidAuth } from "../../types/hono.js";
import type { User } from "../../types.js";
import { getBaseUrl } from "../../utils/helpers/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const getAuthenticatedUser: ServiceFn<
	[
		{
			userId: number;
			authUser: LucidAuth;
		},
	],
	User
> = async (context, data) => {
	const Users = new UsersRepository(context.db.client, context.config.db);
	const EmailChangeRequests = new EmailChangeRequestsRepository(
		context.db.client,
		context.config.db,
	);

	const [userRes, pendingEmailChangeRes] = await Promise.all([
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
					message: T("user_not_found_message"),
					status: 404,
				},
			},
		}),
		EmailChangeRequests.selectActivePendingForUser({
			userId: data.userId,
		}),
	]);
	if (userRes.error) return userRes;
	if (pendingEmailChangeRes.error) return pendingEmailChangeRes;

	return {
		error: undefined,
		data: usersFormatter.formatSingle({
			user: userRes.data,
			authUser: data.authUser,
			host: getBaseUrl(context),
			locales: context.config.localization.locales.map((locale) => locale.code),
			pendingEmailChange: pendingEmailChangeRes.data
				? {
						email: pendingEmailChangeRes.data.new_email,
						requestedAt: pendingEmailChangeRes.data.created_at,
						expiresAt: pendingEmailChangeRes.data.expires_at,
					}
				: null,
		}),
	};
};

export default getAuthenticatedUser;
