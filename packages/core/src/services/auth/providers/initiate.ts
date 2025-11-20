import { randomUUID } from "node:crypto";
import { addMilliseconds } from "date-fns";
import constants from "../../../constants/constants.js";
import getAuthProviderAdapter from "../../../libs/auth-providers/get-adapter.js";
import getAvailableProviders from "../../../libs/auth-providers/get-available-providers.js";
import buildCallbackRedirectUrl from "../../../libs/auth-providers/helpers/build-callback-redirect-url.js";
import formatter from "../../../libs/formatters/index.js";
import {
	UserTokensRepository,
	AuthStatesRepository,
	UsersRepository,
} from "../../../libs/repositories/index.js";
import T from "../../../translations/index.js";
import type {
	AuthStateActionType,
	InitiateAuthResponse,
} from "../../../types.js";
import type { ServiceFn } from "../../../utils/services/types.js";

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
	InitiateAuthResponse
> = async (context, data) => {
	const UserTokens = new UserTokensRepository(context.db, context.config.db);
	const AuthStates = new AuthStatesRepository(context.db, context.config.db);
	const Users = new UsersRepository(context.db, context.config.db);

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
				name: T("provider_not_found_name"),
				message: T("provider_not_found_message"),
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
					value: data.invitationToken,
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
			],
			validation: {
				enabled: true,
				defaultError: {
					status: 404,
					message: T("token_not_found_message"),
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
					message: T("user_not_found_message"),
				},
			},
		});
		if (userRes.error) return userRes;

		if (formatter.formatBoolean(userRes.data.invitation_accepted)) {
			return {
				error: {
					type: "basic",
					status: 400,
					name: T("user_invitation_already_accepted_name"),
					message: T("user_invitation_already_accepted_message"),
				},
				data: undefined,
			};
		}

		invitationTokenId = invitationTokenRes.data.id;
	}

	const stateToken = randomUUID();
	const stateRes = await AuthStates.createSingle({
		data: {
			state: stateToken,
			provider_key: data.providerKey,
			invitation_token_id: invitationTokenId,
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
			context.config.host,
			data.providerKey,
		),
		state: stateToken,
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
