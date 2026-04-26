import { scrypt } from "@noble/hashes/scrypt.js";
import constants from "../../constants/constants.js";
import {
	EmailChangeRequestsRepository,
	UsersRepository,
} from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import generateSecret from "../../utils/helpers/generate-secret.js";
import { formatEmailSubject, getBaseUrl } from "../../utils/helpers/index.js";
import { normalizeEmailInput } from "../../utils/helpers/normalize-input.js";
import type { ServiceFn } from "../../utils/services/types.js";
import {
	emailServices,
	securityAuditServices,
	userServices,
} from "../index.js";
import prepareUpdateSingleAuditLogs from "./helpers/prepare-update-single-audit-logs.js";

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
				message: T("error_cant_update_yourself"),
				status: 400,
			},
			data: undefined,
		};
	}

	const userRes = await Users.selectSinglePreset({
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
	});
	if (userRes.error) return userRes;

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
						message: T("this_email_is_already_in_use"),
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
						message: T("this_username_is_already_in_use"),
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
			roles: userRes.data.roles ?? [],
		},
		normalizedEmail,
		passwordChanged: hashedPassword !== undefined,
		roleIds: data.roleIds,
		superAdmin: data.superAdmin,
		canUpdateSuperAdmin: data.auth.superAdmin,
	});
	if (auditLogsRes.error) return auditLogsRes;

	const [updateUserRes, updateRolesRes] = await Promise.all([
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
		}),
	]);
	if (updateRolesRes.error) return updateRolesRes;
	if (updateUserRes.error) return updateUserRes;

	const auditResults = await Promise.all(
		auditLogsRes.data.logs.map((auditLog) =>
			securityAuditServices.logSecurityAudit(context, auditLog),
		),
	);
	for (const auditRes of auditResults) {
		if (auditRes.error) return auditRes;
	}

	if (auditLogsRes.data.emailChange) {
		const baseUrl = getBaseUrl(context);

		const sendEmailRes = await emailServices.sendEmail(context, {
			template: constants.email.templates.emailChanged.key,
			type: "internal",
			to: auditLogsRes.data.emailChange.newValue,
			subject: formatEmailSubject(
				T("email_update_success_subject"),
				context.config.brand?.name,
			),
			data: {
				firstName: data.firstName || userRes.data.first_name,
				logoUrl: `${baseUrl}${constants.email.assets.logo}`,
				brand: {
					name: context.config.brand?.name,
				},
			},
		});
		if (sendEmailRes.error) return sendEmailRes;
	}

	return {
		error: undefined,
		data: userRes.data.id,
	};
};

export default updateSingle;
