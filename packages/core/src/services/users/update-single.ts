import T from "../../translations/index.js";
import argon2 from "argon2";
import Repository from "../../libs/repositories/index.js";
import constants from "../../constants/constants.js";
import generateSecret from "../../utils/helpers/generate-secret.js";
import type { ServiceFn } from "../../utils/services/types.js";

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
			auth: {
				id: number;
				superAdmin: boolean;
			};
		},
	],
	number
> = async (context, data) => {
	const UsersRepo = Repository.get("users", context.db, context.config.db);

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

	const user = await UsersRepo.selectSingle({
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
	});

	if (!user) {
		return {
			error: {
				type: "basic",
				message: T("user_not_found_message"),
				status: 404,
			},
			data: undefined,
		};
	}

	const [emailExists, usernameExists] = await Promise.all([
		data.email
			? UsersRepo.selectSingle({
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
			? UsersRepo.selectSingle({
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

	if (data.email !== undefined && emailExists !== undefined) {
		return {
			error: {
				type: "basic",
				status: 400,
				errorResponse: {
					body: {
						email: {
							code: "invalid",
							message: T("this_email_is_already_in_use"),
						},
					},
				},
			},
			data: undefined,
		};
	}
	if (data.username !== undefined && usernameExists !== undefined) {
		return {
			error: {
				type: "basic",
				status: 400,
				errorResponse: {
					body: {
						username: {
							code: "invalid",
							message: T("this_username_is_already_in_use"),
						},
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
		hashedPassword = await argon2.hash(data.password, {
			secret: Buffer.from(genSecret.secret),
		});
		encryptSecret = genSecret.encryptSecret;
	}

	const [updateUser, updateRoelsRes] = await Promise.all([
		UsersRepo.updateSingle({
			data: {
				firstName: data.firstName,
				lastName: data.lastName,
				username: data.username,
				email: data.email,
				password: hashedPassword,
				secret: encryptSecret,
				superAdmin: data.auth.superAdmin ? data.superAdmin : undefined,
				updatedAt: new Date().toISOString(),
				triggerPasswordReset: data.triggerPasswordReset,
				isDeleted: data.isDeleted,
			},
			where: [
				{
					key: "id",
					operator: "=",
					value: data.userId,
				},
			],
		}),
		context.services.user.updateMultipleRoles(context, {
			userId: data.userId,
			roleIds: data.roleIds,
		}),
	]);
	if (updateRoelsRes.error) return updateRoelsRes;

	if (updateUser === undefined) {
		return {
			error: {
				type: "basic",
				status: 500,
			},
			data: undefined,
		};
	}

	if (data.email !== undefined) {
		const sendEmailRes = await context.services.email.sendEmail(context, {
			template: constants.emailTemplates.emailChanged,
			type: "internal",
			to: data.email,
			subject: T("email_update_success_subject"),
			data: {
				firstName: data.firstName || user.first_name,
			},
		});
		if (sendEmailRes.error) return sendEmailRes;
	}

	return {
		error: undefined,
		data: user.id,
	};
};

export default updateSingle;
