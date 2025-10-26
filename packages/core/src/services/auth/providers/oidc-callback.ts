import getAuthProviderAdapter from "../../../libs/auth-providers/get-adapter.js";
import getAvailableProviders from "../../../libs/auth-providers/get-available-providers.js";
import Formatter from "../../../libs/formatters/index.js";
import Repository from "../../../libs/repositories/index.js";
import T from "../../../translations/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

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

	//* retrieve and validate auth state
	// TODO: store auth state ttl in constants
	const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

	const authStateRes = await AuthStates.selectSingle({
		select: ["id", "provider_key", "invitation_token_id"],
		where: [
			{
				key: "state",
				operator: "=",
				value: data.state,
			},
			{
				key: "created_at",
				operator: ">",
				value: tenMinutesAgo.toISOString(),
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

	const { providerUserId, email, firstName, lastName } = userInfoRes.data;

	let userId: number | undefined;
	// TODO: extract into constants or store in state. If a user is linked in their account for instance we redirect back there?
	const redirectUrl = `${context.config.host}/admin`;

	// TODO:
	// - if there is a invitation_token_id, we need to verify the token and mark the user has accepted the invitation
	//   - also update their profile and ensure their email address matches the users
	// - if there is no invitation, its a standard login flow, check they have a record in UserAuthProviders and the join user has the same email
	//   - if the user exists, but they dont have a record in UserAuthProviders, create one
	//   - if the user doesnt exist, fail
	// - delete auth state

	return {
		error: undefined,
		data: {
			userId: userId || 1,
			redirectUrl: redirectUrl,
		},
	};
};

export default oidcCallback;
