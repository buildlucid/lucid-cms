import { copy } from "../../../libs/i18n/index.js";
import { UsersRepository } from "../../../libs/repositories/index.js";
import { normalizeEmailInput } from "../../../utils/helpers/normalize-input.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import removeAllPasskeys from "../../auth/passkeys/remove-all.js";

/** Resets another user's passkeys. Only super admins can reset a super admin. */
const resetPasskeys: ServiceFn<
	[
		{
			email: string;
		},
	],
	undefined
> = async (context, data) => {
	const Users = new UsersRepository(context.db);

	const userRes = await Users.selectSingle({
		select: ["id"],
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

	return removeAllPasskeys(context, {
		userId: userRes.data.id,
		performedBy: null,
	});
};

export default resetPasskeys;
