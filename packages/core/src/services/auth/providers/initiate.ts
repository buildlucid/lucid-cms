import crypto from "node:crypto";
import { addMilliseconds } from "date-fns";
import constants from "../../../constants/constants.js";
import getAuthProviderAdapter from "../../../libs/auth-providers/get-adapter.js";
import getAvailableProviders from "../../../libs/auth-providers/get-available-providers.js";
import buildCallbackRedirectUrl from "../../../libs/auth-providers/helpers/build-callback-redirect-url.js";
import type { AuthStateActionType } from "../../../libs/db/tables/index.js";
import formatter from "../../../libs/formatters/index.js";
import { copy } from "../../../libs/i18n/index.js";
import {
	AuthStatesRepository,
	UsersRepository,
	UserTokensRepository,
} from "../../../libs/repositories/index.js";
import type { InitiateAuth } from "../../../types.js";
import createPkce from "../../../utils/helpers/create-pkce.js";
import hashUserToken from "../../../utils/helpers/hash-user-token.js";
import { getBaseUrl } from "../../../utils/helpers/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** Creates the state and redirect URL for an auth-provider flow. */
const initiate: ServiceFn<
	[
		{
			providerKey: string;
			actionType: AuthStateActionType;
			redirectPath?: string;
			invitationToken?: string;
			authenticatedUserId?: number;
		},
	],
	InitiateAuth
> = async (context, data) => {
	const UserTokens = new UserTokensRepository(context.db);
	const AuthStates = new AuthStatesRepository(context.db);
	const Users = new UsersRepository(context.db);

	//* check if the provider is enabled and exists
	const availableProviders = getAvailableProviders(context.config);
	const provider = availableProviders.providers.find(
		(p) => p.key === data.providerKey,
	);

	if (!provider) {
		return {
			error: {
				type: "basic",
				status: 404,
				name: copy("server:core.auth.providers.not.found.name"),
				message: copy("server:core.auth.providers.not.found.message"),
			},
			data: undefined,
		};
	}

	//* validate invitation token if provided
	let invitationTokenId: number | undefined;
	if (data.invitationToken) {
		const invitationTokenRes = await UserTokens.selectSingle({
			select: ["id", "user_id", "expiry_date"],
			where: [
				{
					key: "token",
					operator: "=",
					value: hashUserToken(data.invitationToken),
				},
				{
					key: "token_type",
					operator: "=",
					value: constants.userTokens.invitation,
				},
				{
					key: "expiry_date",
					operator: ">",
					value: new Date().toISOString(),
				},
				{
					key: "revoked_at",
					operator: "is",
					value: null,
				},
				{
					key: "consumed_at",
					operator: "is",
					value: null,
				},
			],
			validation: {
				enabled: true,
				defaultError: {
					status: 404,
					message: copy("server:core.tokens.not.found.message"),
				},
			},
		});
		if (invitationTokenRes.error) return invitationTokenRes;

		const userRes = await Users.selectSingle({
			select: ["invitation_accepted"],
			where: [
				{
					key: "id",
					operator: "=",
					value: invitationTokenRes.data.user_id,
				},
			],
			validation: {
				enabled: true,
				defaultError: {
					status: 404,
					message: copy("server:core.user.not.found.message"),
				},
			},
		});
		if (userRes.error) return userRes;

		if (formatter.formatBoolean(userRes.data.invitation_accepted)) {
			return {
				error: {
					type: "basic",
					status: 400,
					name: copy("server:core.auth.invitations.user.already.accepted.name"),
					message: copy(
						"server:core.auth.invitations.user.already.accepted.message",
					),
				},
				data: undefined,
			};
		}

		invitationTokenId = invitationTokenRes.data.id;
	}

	const stateToken = crypto.randomBytes(32).toString("base64url");
	const nonce =
		provider.type === "oidc"
			? crypto.randomBytes(32).toString("base64url")
			: undefined;
	const { codeVerifier, codeChallenge } = createPkce();

	const stateRes = await AuthStates.createSingle({
		data: {
			state: stateToken,
			provider_key: data.providerKey,
			code_verifier: codeVerifier,
			nonce,
			invitation_token_id: invitationTokenId,
			invitation_token:
				data.actionType === constants.authState.actionTypes.invitation
					? data.invitationToken
					: undefined,
			action_type: data.actionType,
			authenticated_user_id: data.authenticatedUserId,
			expiry_date: addMilliseconds(
				new Date(),
				constants.authState.ttl,
			).toISOString(),
			redirect_path: data.redirectPath,
		},
	});
	if (stateRes.error) return stateRes;

	const adapterRes = getAuthProviderAdapter(provider);
	if (adapterRes.error) return adapterRes;

	const redirectUrl = await adapterRes.data.getAuthUrl({
		redirectUri: buildCallbackRedirectUrl(
			getBaseUrl(context),
			data.providerKey,
		),
		state: stateToken,
		codeChallenge,
		nonce,
	});
	if (redirectUrl.error) return redirectUrl;

	return {
		error: undefined,
		data: {
			redirectUrl: redirectUrl.data,
		},
	};
};

export default initiate;
