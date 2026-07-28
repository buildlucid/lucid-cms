import getAuthProviderAdapter from "../../../libs/auth-providers/get-adapter.js";
import getAvailableProviders from "../../../libs/auth-providers/get-available-providers.js";
import buildCallbackRedirectUrl from "../../../libs/auth-providers/helpers/build-callback-redirect-url.js";
import { copy } from "../../../libs/i18n/index.js";
import { AuthStatesRepository } from "../../../libs/repositories/index.js";
import { getBaseUrl } from "../../../utils/helpers/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import type { ConsumedProviderState } from "./consume-state.js";
import processProviderAuth from "./process-provider-auth.js";

/**
 * Handles the callback for configured OAuth 2.0 and OIDC providers.
 *
 * Verifies the provider and state key, then proceeds to authenticate / link the provider to the user based on the
 * states action type.
 */
const callback: ServiceFn<
	[
		{
			providerKey: string;
			code: string;
			authState: ConsumedProviderState;
		},
	],
	{
		redirectUrl: string;
		userId: number;
		grantAuthentication: boolean;
	}
> = async (context, data) => {
	const AuthStates = new AuthStatesRepository(
		context.db.client,
		context.config.db,
	);

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
				name: copy("server:core.auth.providers.not.found.name"),
				message: copy("server:core.auth.providers.not.found.message"),
			},
			data: undefined,
		};
	}

	//* get provider adapter and use the adapter to handle callback and get user info
	const adapterRes = getAuthProviderAdapter(provider);
	if (adapterRes.error) return adapterRes;

	const userInfoRes = await adapterRes.data.handleCallback({
		code: data.code,
		redirectUri: buildCallbackRedirectUrl(
			getBaseUrl(context),
			data.providerKey,
		),
		codeVerifier: data.authState.codeVerifier,
		nonce: data.authState.nonce ?? undefined,
	});
	if (userInfoRes.error) return userInfoRes;

	//* process authentication & cleanup
	const [processAuthRes] = await Promise.all([
		processProviderAuth(context, {
			providerKey: data.providerKey,
			providerUserId: userInfoRes.data.userId,
			firstName: userInfoRes.data.firstName,
			lastName: userInfoRes.data.lastName,
			invitationTokenId: data.authState.invitationTokenId ?? undefined,
			redirectPath: data.authState.redirectPath ?? undefined,
			actionType: data.authState.actionType,
			authenticatedUserId: data.authState.authenticatedUserId ?? undefined,
		}),
		AuthStates.deleteSingle({
			where: [{ key: "id", operator: "=", value: data.authState.id }],
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

export default callback;
