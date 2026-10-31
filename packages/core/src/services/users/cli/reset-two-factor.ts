import { copy } from "../../../libs/i18n/index.js";
import { UsersRepository } from "../../../libs/repositories/index.js";
import { normalizeEmailInput } from "../../../utils/helpers/normalize-input.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import removeTwoFactor from "../../auth/two-factor/remove.js";

/** CLI recovery bypasses admin permission checks because it already has database access. */
const resetTwoFactor: ServiceFn<
	[
		{
			email: string;
		},
	],
	undefined
> = async (context, data) => {
	const Users = new UsersRepository(context.db);

	const userRes = await Users.selectSingle({
		select: ["id", "two_factor_enabled_at"],
		where: [
			{
				key: "email",
				operator: "=",
				value: normalizeEmailInput(data.email),
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
		userId: userRes.data.id,
		performedBy: null,
	});
};

export default resetTwoFactor;
