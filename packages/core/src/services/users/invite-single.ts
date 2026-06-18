import { add } from "date-fns";
import constants from "../../constants/constants.js";
import { copy } from "../../libs/i18n/index.js";
import {
	EmailChangeRequestsRepository,
	UserRolesRepository,
	UsersRepository,
	UserTenantsRepository,
} from "../../libs/repositories/index.js";
import generateSecret from "../../utils/helpers/generate-secret.js";
import { formatEmailSubject } from "../../utils/helpers/index.js";
import { normalizeEmailInput } from "../../utils/helpers/normalize-input.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { emailServices, userServices, userTokenServices } from "../index.js";
import validateUserTenantMemberships from "./helpers/validate-user-tenant-memberships.js";

const inviteSingle: ServiceFn<
	[
		{
			email: string;
			username: string;
			firstName?: string;
			lastName?: string;
			superAdmin?: boolean;
			roleIds: Array<number>;
			tenantKeys?: Array<string>;
			authSuperAdmin: boolean;
		},
	],
	number
> = async (context, data) => {
	const Users = new UsersRepository(context.db.client, context.config.db);
	const EmailChangeRequests = new EmailChangeRequestsRepository(
		context.db.client,
		context.config.db,
	);
	const email = normalizeEmailInput(data.email);

	const [userExistsRes, reservedEmailRes, roleExistsRes] = await Promise.all([
		Users.selectSingleByEmailUsername({
			select: ["id", "username", "email"],
			where: {
				username: data.username,
				email: email,
			},
		}),
		EmailChangeRequests.selectReservedByEmail({
			email,
		}),
		userServices.checks.checkRolesExist(context, {
			roleIds: data.roleIds,
			tenantKey: data.authSuperAdmin ? undefined : context.request.tenantKey,
		}),
	]);
	if (userExistsRes.error) return userExistsRes;
	if (reservedEmailRes.error) return reservedEmailRes;
	if (roleExistsRes.error) return roleExistsRes;

	if (userExistsRes.data !== undefined || reservedEmailRes.data !== undefined) {
		return {
			error: {
				type: "basic",
				status: 500,
				errors: {
					email:
						userExistsRes.data?.email === email ||
						reservedEmailRes.data !== undefined
							? {
									code: "invalid",
									message: copy("server:core.database.duplicates.entry"),
								}
							: undefined,
					username:
						userExistsRes.data?.username === data.username
							? {
									code: "invalid",
									message: copy("server:core.database.duplicates.entry"),
								}
							: undefined,
				},
			},
			data: undefined,
		};
	}

	// Tenant memberships - only super admins decide them, other users add the new user to their current tenant
	const targetSuperAdmin = data.authSuperAdmin && data.superAdmin === true;
	const tenantKeys = Array.from(
		new Set(
			data.authSuperAdmin
				? (data.tenantKeys ?? [])
				: context.request.tenantKey
					? [context.request.tenantKey]
					: [],
		),
	);

	const tenantMembershipsError = validateUserTenantMemberships({
		config: context.config,
		tenantKeys,
		targetSuperAdmin,
	});
	if (tenantMembershipsError !== undefined) {
		return {
			error: tenantMembershipsError,
			data: undefined,
		};
	}

	const { encryptSecret } = generateSecret(context.config.secrets.encryption);

	const newUserRes = await Users.createSingle({
		data: {
			email: email,
			username: data.username,
			first_name: data.firstName,
			last_name: data.lastName,
			super_admin: targetSuperAdmin,
			triggered_password_reset: false,
			secret: encryptSecret,
			invitation_accepted: false,
			is_locked: false,
		},
		returning: ["id"],
		validation: {
			enabled: true,
			defaultError: {
				status: 500,
			},
		},
	});
	if (newUserRes.error) return newUserRes;

	if (tenantKeys.length > 0) {
		const UserTenants = new UserTenantsRepository(
			context.db.client,
			context.config.db,
		);
		const createTenantsRes = await UserTenants.createMultiple({
			data: tenantKeys.map((key) => ({
				user_id: newUserRes.data.id,
				tenant_key: key,
			})),
		});
		if (createTenantsRes.error) return createTenantsRes;
	}

	// Email Invite
	const expiryDate = add(new Date(), {
		minutes: constants.userInviteTokenExpirationMinutes,
	}).toISOString();

	const userTokenRes = await userTokenServices.createSingle(context, {
		userId: newUserRes.data.id,
		tokenType: constants.userTokens.invitation,
		expiryDate: expiryDate,
	});
	if (userTokenRes.error) return userTokenRes;

	const sendEmailRes = await emailServices.sendEmail(context, {
		type: "internal",
		to: email,
		subject: (emailData) =>
			formatEmailSubject(
				context.translate("server:core.email.invitations.email.subject"),
				emailData.context.brand.name,
			),
		template: constants.email.templates.userInvite.key,
		data: {
			firstName: data.firstName,
			lastName: data.lastName,
			email: email,
			inviteLink: `${constants.email.locations.acceptInvitation}?token=${userTokenRes.data.token}`,
		},
		storage: constants.email.templates.userInvite.storage,
		tenantKeys,
	});
	if (sendEmailRes.error) return sendEmailRes;

	// Roles
	if (data.roleIds === undefined || data.roleIds.length === 0) {
		return {
			error: undefined,
			data: newUserRes.data.id,
		};
	}

	const UserRoles = new UserRolesRepository(
		context.db.client,
		context.config.db,
	);

	const createMultipleRes = await UserRoles.createMultiple({
		data: data.roleIds.map((r) => ({
			user_id: newUserRes.data.id,
			role_id: r,
		})),
	});
	if (createMultipleRes.error) return createMultipleRes;

	return {
		error: undefined,
		data: newUserRes.data.id,
	};
};

export default inviteSingle;
