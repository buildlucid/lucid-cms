import getAuthProviderAdapter from "../../../libs/auth-providers/get-adapter.js";
import getAvailableProviders from "../../../libs/auth-providers/get-available-providers.js";
import Repository from "../../../libs/repositories/index.js";
import T from "../../../translations/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import processProviderAuth from "./helpers/process-provider-auth.js";

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
	}
> = async (context, data) => {
	const AuthStates = Repository.get(
		"auth-states",
		context.db,
		context.config.db,
	);

	//* retrieve and validate auth state
	const authStateRes = await AuthStates.selectSingle({
		select: [
			"id",
			"provider_key",
			"invitation_token_id",
			"redirect_path",
			"action_type",
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

	//* provider key matche check
	if (authStateRes.data.provider_key !== data.providerKey) {
		return {
			error: {
				type: "basic",
				status: 400,
				name: T("provider_mismatch_name"),
				message: T("provider_mismatch_message"),
			},
			data: undefined,
		};
	}

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

	//* get provider adapter and use the adapter to handle callback and get user info
	const adapterRes = getAuthProviderAdapter(provider);
	if (adapterRes.error) return adapterRes;

	const userInfoRes = await adapterRes.data.handleCallback({
		code: data.code,
		state: data.state,
	});
	if (userInfoRes.error) return userInfoRes;

	//* process authentication
	const processAuthRes = await processProviderAuth(context, {
		providerKey: data.providerKey,
		providerUserId: userInfoRes.data.providerUserId,
		email: userInfoRes.data.email,
		firstName: userInfoRes.data.firstName,
		lastName: userInfoRes.data.lastName,
		invitationTokenId: authStateRes.data.invitation_token_id ?? undefined,
		redirectPath: authStateRes.data.redirect_path ?? undefined,
		actionType: authStateRes.data.action_type ?? undefined,
	});
	if (processAuthRes.error) return processAuthRes;

	//* delete auth state
	await AuthStates.deleteSingle({
		where: [{ key: "id", operator: "=", value: authStateRes.data.id }],
	});

	return {
		error: undefined,
		data: {
			userId: processAuthRes.data.userId,
			redirectUrl: processAuthRes.data.redirectUrl,
		},
	};
};

export default oidcCallback;
