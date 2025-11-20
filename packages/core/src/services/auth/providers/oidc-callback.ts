import getAuthProviderAdapter from "../../../libs/auth-providers/get-adapter.js";
import getAvailableProviders from "../../../libs/auth-providers/get-available-providers.js";
import buildCallbackRedirectUrl from "../../../libs/auth-providers/helpers/build-callback-redirect-url.js";
import { AuthStatesRepository } from "../../../libs/repositories/index.js";
import T from "../../../translations/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import processProviderAuth from "./helpers/process-provider-auth.js";

/**
 * The callback endpoint for OIDC auth flow.
 *
 * Verifies the provider and state key, then proceeds to authenticate / link the provider to the user based on the
 * states action type.
 */
const oidcCallback: ServiceFn<
	[
		{
			providerKey: string;
			code: string;
			state: string;
		},
	],
	{
		redirectUrl: string;
		userId: number;
		grantAuthentication: boolean;
	}
> = async (context, data) => {
	const AuthStates = new AuthStatesRepository(context.db, context.config.db);

	//* get provider config
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

	//* retrieve and validate auth state
	const authStateRes = await AuthStates.selectSingle({
		select: [
			"id",
			"provider_key",
			"invitation_token_id",
			"redirect_path",
			"action_type",
			"authenticated_user_id",
		],
		where: [
			{
				key: "state",
				operator: "=",
				value: data.state,
			},
			{
				key: "expiry_date",
				operator: ">",
				value: new Date().toISOString(),
			},
			{
				key: "provider_key",
				operator: "=",
				value: data.providerKey,
			},
		],
		validation: {
			enabled: true,
			defaultError: {
				status: 400,
				message: T("invalid_or_expired_state_message"),
			},
		},
	});
	if (authStateRes.error) return authStateRes;

	//* get provider adapter and use the adapter to handle callback and get user info
	const adapterRes = getAuthProviderAdapter(provider);
	if (adapterRes.error) return adapterRes;

	const userInfoRes = await adapterRes.data.handleCallback({
		code: data.code,
		state: data.state,
		redirectUri: buildCallbackRedirectUrl(
			context.config.host,
			data.providerKey,
		),
	});
	if (userInfoRes.error) return userInfoRes;

	//* process authentication & cleanup
	const [processAuthRes] = await Promise.all([
		processProviderAuth(context, {
			providerKey: data.providerKey,
			providerUserId: userInfoRes.data.userId,
			firstName: userInfoRes.data.firstName,
			lastName: userInfoRes.data.lastName,
			invitationTokenId: authStateRes.data.invitation_token_id ?? undefined,
			redirectPath: authStateRes.data.redirect_path ?? undefined,
			actionType: authStateRes.data.action_type ?? undefined,
			authenticatedUserId: authStateRes.data.authenticated_user_id ?? undefined,
		}),
		AuthStates.deleteSingle({
			where: [{ key: "id", operator: "=", value: authStateRes.data.id }],
		}),
	]);
	if (processAuthRes.error) return processAuthRes;

	return {
		error: undefined,
		data: {
			userId: processAuthRes.data.userId,
			redirectUrl: processAuthRes.data.redirectUrl,
			grantAuthentication: processAuthRes.data.grantAuthentication,
		},
	};
};

export default oidcCallback;
