import { scrypt } from "@noble/hashes/scrypt.js";
import constants from "../../constants/constants.js";
import formatter from "../../libs/formatters/index.js";
import { copy } from "../../libs/i18n/index.js";
import {
	EmailChangeRequestsRepository,
	UsersRepository,
} from "../../libs/repositories/index.js";
import generateSecret from "../../utils/helpers/generate-secret.js";
import {
	formatEmailSubject,
	getEmailLogoUrl,
	multiTenancyEnabled,
} from "../../utils/helpers/index.js";
import { normalizeEmailInput } from "../../utils/helpers/normalize-input.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { invalidateAuthCache } from "../auth/helpers/auth-cache.js";
import {
	emailServices,
	securityAuditServices,
	userServices,
} from "../index.js";
import prepareUpdateSingleAuditLogs from "./helpers/prepare-update-single-audit-logs.js";
import validateUserTenantMemberships from "./helpers/validate-user-tenant-memberships.js";

const updateSingle: ServiceFn<
	[
		{
			userId: number;
			firstName?: string;
			lastName?: string;
			username?: string;
			email?: string;
			password?: string;
			roleIds?: number[];
			superAdmin?: boolean;
			triggerPasswordReset?: boolean;
			isDeleted?: boolean;
			isLocked?: boolean;
			tenantKeys?: string[];
			auth: {
				id: number;
				superAdmin: boolean;
			};
		},
	],
	number
> = async (context, data) => {
	const Users = new UsersRepository(context.db.client, context.config.db);
	const EmailChangeRequests = new EmailChangeRequestsRepository(
		context.db.client,
		context.config.db,
	);
	const normalizedEmail =
		data.email !== undefined ? normalizeEmailInput(data.email) : undefined;

	if (data.auth.id === data.userId) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.users.self.update.denied"),
				status: 400,
			},
			data: undefined,
		};
	}

	const userRes = await Users.selectSinglePreset({
		tenantKey: context.request.tenantKey,
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
	});
	if (userRes.error) return userRes;

	const currentSuperAdmin = formatter.formatBoolean(
		userRes.data.super_admin ?? false,
	);
	const existingTenantKeys = multiTenancyEnabled(context.config)
		? userRes.data.tenants.map((tenant) => tenant.tenant_key)
		: [];
	const targetSuperAdmin =
		data.auth.superAdmin && data.superAdmin !== undefined
			? data.superAdmin
			: currentSuperAdmin;

	const targetTenantKeys =
		data.auth.superAdmin && data.tenantKeys !== undefined
			? Array.from(new Set(data.tenantKeys))
			: existingTenantKeys;

	const tenantMembershipsError = validateUserTenantMemberships({
		config: context.config,
		tenantKeys: targetTenantKeys,
		targetSuperAdmin,
	});
	if (tenantMembershipsError !== undefined) {
		return {
			error: tenantMembershipsError,
			data: undefined,
		};
	}

	const [emailExists, reservedEmail, usernameExists] = await Promise.all([
		normalizedEmail !== undefined && normalizedEmail !== userRes.data.email
			? Users.selectSingle({
					select: ["email"],
					where: [
						{
							key: "email",
							operator: "=",
							value: normalizedEmail,
						},
						{
							key: "id",
							operator: "!=",
							value: data.userId,
						},
					],
				})
			: undefined,
		normalizedEmail !== undefined && normalizedEmail !== userRes.data.email
			? EmailChangeRequests.selectReservedByEmail({
					email: normalizedEmail,
				})
			: undefined,
		data.username
			? Users.selectSingle({
					select: ["username"],
					where: [
						{
							key: "username",
							operator: "=",
							value: data.username,
						},
					],
				})
			: undefined,
	]);
	if (emailExists?.error) return emailExists;
	if (reservedEmail?.error) return reservedEmail;
	if (usernameExists?.error) return usernameExists;

	if (
		normalizedEmail !== undefined &&
		normalizedEmail !== userRes.data.email &&
		(emailExists?.data !== undefined || reservedEmail?.data !== undefined)
	) {
		return {
			error: {
				type: "basic",
				status: 400,
				errors: {
					email: {
						code: "invalid",
						message: copy("server:core.users.email.duplicate"),
					},
				},
			},
			data: undefined,
		};
	}
	if (data.username !== undefined && usernameExists?.data !== undefined) {
		return {
			error: {
				type: "basic",
				status: 400,
				errors: {
					username: {
						code: "invalid",
						message: copy("server:core.users.username.duplicate"),
					},
				},
			},
			data: undefined,
		};
	}

	let hashedPassword: string | undefined;
	let encryptSecret: string | undefined;
	if (data.password) {
		const genSecret = generateSecret(context.config.secrets.encryption);
		// Hash password using scrypt
		hashedPassword = Buffer.from(
			scrypt(data.password, genSecret.secret, constants.scrypt),
		).toString("base64");
		encryptSecret = genSecret.encryptSecret;
	}

	const auditLogsRes = await prepareUpdateSingleAuditLogs(context, {
		userId: data.userId,
		performedBy: data.auth.id,
		currentUser: {
			email: userRes.data.email,
			superAdmin: userRes.data.super_admin,
			roles:
				userRes.data.roles?.map((role) => ({
					id: role.id,
					name:
						role.translations?.find(
							(translation) =>
								translation.locale_code ===
								context.config.localization.defaultLocale,
						)?.name ??
						role.translations?.find((translation) => translation.name !== null)
							?.name ??
						"",
				})) ?? [],
		},
		normalizedEmail,
		passwordChanged: hashedPassword !== undefined,
		roleIds: data.roleIds,
		superAdmin: data.superAdmin,
		canUpdateSuperAdmin: data.auth.superAdmin,
	});
	if (auditLogsRes.error) return auditLogsRes;

	const [updateUserRes, updateRolesRes, updateTenantsRes] = await Promise.all([
		Users.updateSingle({
			data: {
				first_name: data.firstName,
				last_name: data.lastName,
				username: data.username,
				email: normalizedEmail,
				password: hashedPassword,
				secret: encryptSecret,
				super_admin: data.auth.superAdmin ? data.superAdmin : undefined,
				updated_at: new Date().toISOString(),
				triggered_password_reset: data.triggerPasswordReset,
				is_deleted: data.isDeleted,
				is_locked: data.isLocked,
			},
			where: [
				{
					key: "id",
					operator: "=",
					value: data.userId,
				},
			],
			returning: ["id", "first_name", "last_name", "email"],
			validation: {
				enabled: true,
				defaultError: {
					status: 500,
				},
			},
		}),
		userServices.updateMultipleRoles(context, {
			userId: data.userId,
			roleIds: data.roleIds,
			tenantKey: context.request.tenantKey,
		}),
		userServices.updateMultipleTenants(context, {
			userId: data.userId,
			//* only super admins can manage tenant memberships
			tenantKeys:
				data.auth.superAdmin && data.tenantKeys !== undefined
					? targetTenantKeys
					: undefined,
		}),
	]);
	await invalidateAuthCache(context.kv);

	if (updateRolesRes.error) return updateRolesRes;
	if (updateUserRes.error) return updateUserRes;
	if (updateTenantsRes.error) return updateTenantsRes;

	const auditResults = await Promise.all(
		auditLogsRes.data.logs.map((auditLog) =>
			securityAuditServices.logSecurityAudit(context, auditLog),
		),
	);
	for (const auditRes of auditResults) {
		if (auditRes.error) return auditRes;
	}

	if (auditLogsRes.data.emailChange) {
		const emailTenantKeys =
			data.auth.superAdmin && data.tenantKeys !== undefined
				? targetTenantKeys
				: existingTenantKeys;

		const sendEmailRes = await emailServices.sendEmail(context, {
			template: constants.email.templates.emailChanged.key,
			type: "internal",
			to: auditLogsRes.data.emailChange.newValue,
			subject: (emailData) =>
				formatEmailSubject(
					context.translate("server:core.email.update.success.subject"),
					emailData.context.brand.name,
				),
			data: {
				firstName: data.firstName || userRes.data.first_name,
				logoUrl: getEmailLogoUrl(context),
			},
			tenantKeys: emailTenantKeys,
		});
		if (sendEmailRes.error) return sendEmailRes;
	}

	return {
		error: undefined,
		data: userRes.data.id,
	};
};

export default updateSingle;
