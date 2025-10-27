import Formatter from "../../../../libs/formatters/index.js";
import Repository from "../../../../libs/repositories/index.js";
import T from "../../../../translations/index.js";
import type { ServiceFn } from "../../../../utils/services/types.js";

/**
 * A shared service for the oidc and saml callbacks to process the provider auth regarding
 * how it links to the users account.
 */
const processProviderAuth: ServiceFn<
	[
		{
			providerKey: string;
			providerUserId: string;
			email: string;
			firstName?: string;
			lastName?: string;
			invitationTokenId?: number;
		},
	],
	{
		userId: number;
		redirectUrl: string;
	}
> = async (context, data) => {
	const UserAuthProviders = Repository.get(
		"user-auth-providers",
		context.db,
		context.config.db,
	);
	const UserTokens = Repository.get(
		"user-tokens",
		context.db,
		context.config.db,
	);
	const Users = Repository.get("users", context.db, context.config.db);

	// TODO: have this be determined by the state. if user authenticates on the account page, redirect to account page etc.
	const redirectUrl = `${context.config.host}/admin`;

	//* invitation flow
	if (data.invitationTokenId) {
		const invitationTokenRes = await UserTokens.selectSingle({
			select: ["user_id"],
			where: [
				{
					key: "id",
					operator: "=",
					value: data.invitationTokenId,
				},
			],
			validation: {
				enabled: true,
				defaultError: {
					status: 404,
					message: T("invitation_token_not_found_message"),
				},
			},
		});
		if (invitationTokenRes.error) return invitationTokenRes;

		const userId = invitationTokenRes.data.user_id;

		// TODO: join off user token query
		const userRes = await Users.selectSingle({
			select: ["email", "invitation_accepted", "first_name", "last_name"],
			where: [
				{ key: "id", operator: "=", value: userId },
				{
					key: "is_deleted",
					operator: "=",
					value: context.config.db.getDefault("boolean", "false"),
				},
			],
			validation: {
				enabled: true,
				defaultError: {
					status: 404,
					message: T("user_not_found_message"),
				},
			},
		});
		if (userRes.error) return userRes;

		if (userRes.data.email !== data.email) {
			return {
				error: {
					type: "basic",
					status: 400,
					name: T("email_mismatch_name"),
					message: T("email_mismatch_message"),
				},
				data: undefined,
			};
		}

		if (Formatter.formatBoolean(userRes.data.invitation_accepted)) {
			return {
				error: {
					type: "basic",
					status: 400,
					name: T("invitation_already_accepted_name"),
					message: T("invitation_already_accepted_message"),
				},
				data: undefined,
			};
		}

		// TODO: join off user token query
		const existingLinkRes = await UserAuthProviders.selectSingle({
			select: ["user_id"],
			where: [
				{
					key: "provider_key",
					operator: "=",
					value: data.providerKey,
				},
				{
					key: "provider_user_id",
					operator: "=",
					value: data.providerUserId,
				},
			],
		});
		if (existingLinkRes.data && existingLinkRes.data.user_id !== userId) {
			return {
				error: {
					type: "basic",
					status: 400,
					name: T("provider_already_linked_name"),
					message: T("provider_already_linked_message"),
				},
				data: undefined,
			};
		}

		const [linkRes, updateUserRes] = await Promise.all([
			existingLinkRes.data
				? undefined
				: UserAuthProviders.createSingle({
						data: {
							user_id: userId,
							provider_key: data.providerKey,
							provider_user_id: data.providerUserId,
							linked_at: new Date().toISOString(),
						},
					}),
			Users.updateSingle({
				where: [{ key: "id", operator: "=", value: userId }],
				data: {
					first_name: userRes.data.first_name ?? data.firstName,
					last_name: userRes.data.last_name ?? data.lastName,
					invitation_accepted: true,
				},
			}),
			UserTokens.deleteSingle({
				where: [
					{
						key: "id",
						operator: "=",
						value: data.invitationTokenId,
					},
				],
			}),
		]);
		if (linkRes?.error) return linkRes;
		if (updateUserRes.error) return updateUserRes;

		return {
			error: undefined,
			data: {
				userId: userId,
				redirectUrl: redirectUrl,
			},
		};
	}

	//* regular login flow
	// TODO: join user on provider link
	const [providerLinkRes, userByEmailRes] = await Promise.all([
		UserAuthProviders.selectSingle({
			select: ["user_id"],
			where: [
				{
					key: "provider_key",
					operator: "=",
					value: data.providerKey,
				},
				{
					key: "provider_user_id",
					operator: "=",
					value: data.providerUserId,
				},
			],
			validation: {
				enabled: true,
			},
		}),
		Users.selectSingle({
			select: ["id"],
			where: [
				{
					key: "email",
					operator: "=",
					value: data.email,
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
					name: T("no_account_found_name"),
					message: T("no_account_found_message"),
				},
			},
		}),
	]);
	if (providerLinkRes.error) return providerLinkRes;
	if (userByEmailRes.error) return userByEmailRes;

	if (providerLinkRes.data.user_id !== userByEmailRes.data.id) {
		return {
			error: {
				type: "basic",
				status: 400,
				name: T("user_mismatch_name"),
				message: T("user_mismatch_message"),
			},
			data: undefined,
		};
	}

	// TODO: add a new link flow, so if the user is authenticated already, and they login with a
	// provider that they dont have linked yet, we should link them

	return {
		error: undefined,
		data: {
			userId: providerLinkRes.data.user_id,
			redirectUrl: redirectUrl,
		},
	};
};

export default processProviderAuth;
