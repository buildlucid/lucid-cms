import { UserRolesRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** Checks global, super admin and role requirements for two-factor authentication. */
const isRequired: ServiceFn<
	[
		{
			userId: number;
			superAdmin: boolean;
		},
	],
	boolean
> = async (context, data) => {
	const { enabled, required } = context.config.auth.twoFactor;

	if (!enabled) return { error: undefined, data: false };
	if (required === true) return { error: undefined, data: true };
	if (required === "super-admins" && data.superAdmin) {
		return { error: undefined, data: true };
	}

	const UserRoles = new UserRolesRepository(context.db);
	return UserRoles.selectRequiresTwoFactor({ userId: data.userId });
};

export default isRequired;
