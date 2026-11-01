import formatter from "../../../libs/formatters/index.js";
import { UsersRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import hasPasskeys from "../passkeys/has-passkeys.js";
import isRequired from "./is-required.js";

/** Checks whether required two-factor authentication lacks an app or passkey. */
const needsSetup: ServiceFn<
	[
		{
			userId: number;
		},
	],
	boolean
> = async (context, data) => {
	if (!context.config.auth.twoFactor.enabled) {
		return { error: undefined, data: false };
	}

	const Users = new UsersRepository(context.db);
	const [userRes, passkeysRes] = await Promise.all([
		Users.selectSingle({
			select: ["two_factor_enabled_at", "super_admin"],
			where: [
				{
					key: "id",
					operator: "=",
					value: data.userId,
				},
			],
			validation: {
				enabled: true,
			},
		}),
		hasPasskeys(context, { userId: data.userId }),
	]);
	if (userRes.error) return userRes;
	if (passkeysRes.error) return passkeysRes;

	if (userRes.data.two_factor_enabled_at !== null || passkeysRes.data) {
		return { error: undefined, data: false };
	}

	return isRequired(context, {
		userId: data.userId,
		superAdmin: formatter.formatBoolean(userRes.data.super_admin),
	});
};

export default needsSetup;
