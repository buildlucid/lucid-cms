import formatter from "../../libs/formatters/index.js";
import { copy } from "../../libs/i18n/index.js";
import { UsersRepository } from "../../libs/repositories/index.js";
import type { LucidAuth } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import removeAllPasskeys from "../auth/passkeys/remove-all.js";

/** Resets another user's passkeys. Only super admins can reset a super admin. */
const resetPasskeys: ServiceFn<
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
				message: copy("server:core.auth.passkeys.reset.self.message"),
			},
			data: undefined,
		};
	}

	const Users = new UsersRepository(context.db);

	const userRes = await Users.selectSingle({
		select: ["super_admin"],
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
				message: copy("server:core.auth.passkeys.reset.super.admin.message"),
			},
			data: undefined,
		};
	}

	return removeAllPasskeys(context, {
		userId: data.userId,
		performedBy: data.auth.id,
	});
};

export default resetPasskeys;
