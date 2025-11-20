import constants from "../../../../constants/constants.js";
import formatter from "../../../../libs/formatters/index.js";
import {
	UsersRepository,
	UserTokensRepository,
	UserAuthProvidersRepository,
} from "../../../../libs/repositories/index.js";
import T from "../../../../translations/index.js";
import type { AuthStateActionType } from "../../../../types.js";
import urlAddPath from "../../../../utils/helpers/url-add-path.js";
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
			firstName?: string;
			lastName?: string;
			invitationTokenId?: number;
			redirectPath?: string;
			actionType: AuthStateActionType;
			authenticatedUserId?: number;
		},
	],
	{
		userId: number;
		redirectUrl: string;
		grantAuthentication: boolean;
	}
> = async (context, data) => {
	const UserAuthProviders = new UserAuthProvidersRepository(
		context.db,
		context.config.db,
	);
	const UserTokens = new UserTokensRepository(context.db, context.config.db);
	const Users = new UsersRepository(context.db, context.config.db);

	const redirectUrl = urlAddPath(
		context.config.host,
		data.redirectPath ?? constants.authState.defaultRedirectPath,
	);

	// -----------------------------------------------------
	//* invitation flow
	if (
		data.actionType === constants.authState.actionTypes.invitation &&
		data.invitationTokenId
	) {
		const [invitationTokenRes, userAuthProviderRes] = await Promise.all([
			UserTokens.selectUserInvitation({
				id: data.invitationTokenId,
				validation: {
					enabled: true,
					defaultError: {
						status: 404,
						message: T("invitation_token_not_found_message"),
					},
				},
			}),
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
			}),
		]);
		if (invitationTokenRes.error) return invitationTokenRes;
		if (userAuthProviderRes.error) return userAuthProviderRes;

		//* check if the user is soft deleted
		if (formatter.formatBoolean(invitationTokenRes.data.user_is_deleted)) {
			return {
				error: {
					status: 400,
					name: T("auth_provider_user_is_deleted_name"),
					message: T("auth_provider_user_is_deleted_message"),
				},
			};
		}

		//* check if the user is locked
		if (formatter.formatBoolean(invitationTokenRes.data.user_is_locked)) {
			return {
				error: {
					status: 401,
					name: T("auth_provider_user_is_locked_name"),
					message: T("auth_provider_user_is_locked_message"),
				},
			};
		}

		//* check if the user has accepted an invitation already
		if (
			formatter.formatBoolean(invitationTokenRes.data.user_invitation_accepted)
		) {
			return {
				error: {
					status: 400,
					name: T("auth_provider_user_invitation_accepted_name"),
					message: T("auth_provider_user_invitation_accepted_message"),
				},
			};
		}
		//* we've found a user auth provider entry for the users provider userid,
		//* but the entry doesnt match the users id that theyre accepting the invitation on behalf of
		if (
			userAuthProviderRes.data &&
			invitationTokenRes.data.user_id !== userAuthProviderRes.data.user_id
		) {
			return {
				error: {
					status: 400,
					name: T("auth_provider_user_id_mismatch_name"),
					message: T("auth_provider_user_id_mismatch_message"),
				},
			};
		}

		//* update the user, create a user auth provider entry and delete the invitation token
		const [linkRes, updateUserRes] = await Promise.all([
			userAuthProviderRes.data
				? undefined
				: UserAuthProviders.createSingle({
						data: {
							user_id: invitationTokenRes.data.user_id,
							provider_key: data.providerKey,
							provider_user_id: data.providerUserId,
							linked_at: new Date().toISOString(),
							updated_at: new Date().toISOString(),
						},
					}),
			Users.updateSingle({
				where: [
					{ key: "id", operator: "=", value: invitationTokenRes.data.user_id },
				],
				data: {
					first_name: invitationTokenRes.data.user_first_name
						? undefined
						: data.firstName,
					last_name: invitationTokenRes.data.user_last_name
						? undefined
						: data.lastName,
					invitation_accepted: true,
					updated_at: new Date().toISOString(),
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
				userId: invitationTokenRes.data.user_id,
				redirectUrl: redirectUrl,
				grantAuthentication: true,
			},
		};
	}

	// ----------------------------------------------------
	// authLink flow
	if (data.actionType === constants.authState.actionTypes.authLink) {
		//* the user is trying to link a provider, but the autenticatedUserId is not provided
		if (!data.authenticatedUserId) {
			return {
				error: {
					status: 401,
					name: T("auth_provider_link_user_not_authenticated_name"),
					message: T("auth_provider_link_user_not_authenticated_message"),
				},
				data: undefined,
			};
		}

		const userAuthProviderRes = await UserAuthProviders.selectUserAuthProvider({
			providerKey: data.providerKey,
			providerUserId: data.providerUserId,
		});
		if (userAuthProviderRes.error) return userAuthProviderRes;

		//* check if the target user is deleted
		if (
			userAuthProviderRes.data &&
			formatter.formatBoolean(userAuthProviderRes.data.user_is_deleted)
		) {
			return {
				error: {
					status: 404,
					name: T("auth_provider_user_is_deleted_name"),
					message: T("auth_provider_user_is_deleted_message"),
				},
				data: undefined,
			};
		}

		//* check if the target user is locked
		if (
			userAuthProviderRes.data &&
			formatter.formatBoolean(userAuthProviderRes.data.user_is_locked)
		) {
			return {
				error: {
					status: 401,
					name: T("auth_provider_user_is_locked_name"),
					message: T("auth_provider_user_is_locked_message"),
				},
				data: undefined,
			};
		}

		//* check if the user auth provider is exists, but linked to another user
		if (
			userAuthProviderRes.data &&
			userAuthProviderRes.data.user_id !== data.authenticatedUserId
		) {
			return {
				error: {
					status: 400,
					name: T("auth_provider_user_id_mismatch_name"),
					message: T("auth_provider_user_id_mismatch_message"),
				},
				data: undefined,
			};
		}

		//* check if the authenticated user is trying to link to a provider they already have
		if (
			userAuthProviderRes.data &&
			userAuthProviderRes.data.user_id === data.authenticatedUserId
		) {
			return {
				error: {
					status: 400,
					name: T("auth_provider_already_linked_name"),
					message: T("auth_provider_already_linked_message"),
				},
				data: undefined,
			};
		}

		//* create the auth provider link
		const [linkRes, updateUserRes] = await Promise.all([
			UserAuthProviders.createSingle({
				data: {
					user_id: data.authenticatedUserId,
					provider_key: data.providerKey,
					provider_user_id: data.providerUserId,
					linked_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				},
			}),
			Users.updateSingle({
				where: [{ key: "id", operator: "=", value: data.authenticatedUserId }],
				data: {
					updated_at: new Date().toISOString(),
				},
			}),
		]);
		if (linkRes.error) return linkRes;
		if (updateUserRes.error) return updateUserRes;

		return {
			error: undefined,
			data: {
				userId: data.authenticatedUserId,
				redirectUrl: redirectUrl,
				// they're already authenticated, so dont bother refreshing their access/refresh tokens
				grantAuthentication: false,
			},
		};
	}

	// -----------------------------------------------------
	// login flow
	const userAuthProviderRes = await UserAuthProviders.selectUserAuthProvider({
		providerKey: data.providerKey,
		providerUserId: data.providerUserId,
		validation: {
			enabled: true,
			defaultError: {
				status: 404,
				name: T("auth_provider_user_not_found_name"),
				message: T("auth_provider_user_not_found_message"),
			},
		},
	});
	if (userAuthProviderRes.error) return userAuthProviderRes;

	if (formatter.formatBoolean(userAuthProviderRes.data.user_is_deleted)) {
		return {
			error: {
				status: 404,
				name: T("auth_provider_user_is_deleted_name"),
				message: T("auth_provider_user_is_deleted_message"),
			},
			data: undefined,
		};
	}

	if (formatter.formatBoolean(userAuthProviderRes.data.user_is_locked)) {
		return {
			error: {
				status: 401,
				name: T("auth_provider_user_is_locked_name"),
				message: T("auth_provider_user_is_locked_message"),
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: {
			userId: userAuthProviderRes.data.user_id,
			redirectUrl: redirectUrl,
			grantAuthentication: true,
		},
	};
};

export default processProviderAuth;
