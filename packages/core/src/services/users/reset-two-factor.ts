import formatter from "../../libs/formatters/index.js";
import { copy } from "../../libs/i18n/index.js";
import { UsersRepository } from "../../libs/repositories/index.js";
import type { LucidAuth } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import removeTwoFactor from "../auth/two-factor/remove.js";

/**
 * Resets another user's two-factor authentication. Required setup resumes at next login; super admins
 * can only be reset by super admins.
 */
const resetTwoFactor: ServiceFn<
	[
		{
			auth: LucidAuth;
			userId: number;
		},
	],
	undefined
> = async (context, data) => {
	if (data.auth.id === data.userId) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:core.auth.two.factor.reset.self.message"),
			},
			data: undefined,
		};
	}

	const Users = new UsersRepository(context.db);
	const userRes = await Users.selectSingle({
		select: ["super_admin", "two_factor_enabled_at"],
		where: [
			{
				key: "id",
				operator: "=",
				value: data.userId,
			},
		],
		validation: {
			enabled: true,
			defaultError: {
				status: 404,
				message: copy("server:core.user.not.found.message"),
			},
		},
	});
	if (userRes.error) return userRes;

	if (
		formatter.formatBoolean(userRes.data.super_admin) &&
		!data.auth.superAdmin
	) {
		return {
			error: {
				type: "forbidden",
				status: 403,
				message: copy("server:core.auth.two.factor.reset.super.admin.message"),
			},
			data: undefined,
		};
	}

	if (!userRes.data.two_factor_enabled_at) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:core.auth.two.factor.not.enabled.message"),
			},
			data: undefined,
		};
	}

	return removeTwoFactor(context, {
		userId: data.userId,
		performedBy: data.auth.id,
	});
};

export default resetTwoFactor;
