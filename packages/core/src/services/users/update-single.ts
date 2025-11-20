import { scrypt } from "@noble/hashes/scrypt.js";
import constants from "../../constants/constants.js";
import { UsersRepository } from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import generateSecret from "../../utils/helpers/generate-secret.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { emailServices, userServices } from "../index.js";

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
	const Users = new UsersRepository(context.db, context.config.db);

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

	const userRes = await Users.selectSingle({
		select: ["id", "first_name"],
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

	const [emailExists, usernameExists] = await Promise.all([
		data.email
			? Users.selectSingle({
					select: ["email"],
					where: [
						{
							key: "email",
							operator: "=",
							value: data.email,
						},
					],
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
	if (usernameExists?.error) return usernameExists;

	if (data.email !== undefined && emailExists?.data !== undefined) {
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

	let hashedPassword = undefined;
	let encryptSecret = undefined;
	if (data.password) {
		const genSecret = generateSecret(context.config.keys.encryptionKey);
		// Hash password using scrypt
		hashedPassword = Buffer.from(
			scrypt(data.password, genSecret.secret, constants.scrypt),
		).toString("base64");
		encryptSecret = genSecret.encryptSecret;
	}

	const [updateUserRes, updateRoelsRes] = await Promise.all([
		Users.updateSingle({
			data: {
				first_name: data.firstName,
				last_name: data.lastName,
				username: data.username,
				email: data.email,
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
	if (updateRoelsRes.error) return updateRoelsRes;
	if (updateUserRes.error) return updateUserRes;

	if (data.email !== undefined) {
		const sendEmailRes = await emailServices.sendEmail(context, {
			template: constants.emailTemplates.emailChanged,
			type: "internal",
			to: data.email,
			subject: T("email_update_success_subject"),
			data: {
				firstName: data.firstName || userRes.data.first_name,
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
