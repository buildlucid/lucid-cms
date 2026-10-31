import formatter from "../../../libs/formatters/index.js";
import { UserPasskeysRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** Stored passkeys count only while passkey authentication is enabled. */
const hasPasskeys: ServiceFn<
	[
		{
			userId: number;
		},
	],
	boolean
> = async (context, data) => {
	if (!context.config.auth.passkeys.enabled) {
		return { error: undefined, data: false };
	}

	const Passkeys = new UserPasskeysRepository(context.db);
	const countRes = await Passkeys.count({
		where: [
			{
				key: "user_id",
				operator: "=",
				value: data.userId,
			},
		],
	});
	if (countRes.error) return countRes;

	return {
		error: undefined,
		data: formatter.parseCount(countRes.data?.count) > 0,
	};
};

export default hasPasskeys;
