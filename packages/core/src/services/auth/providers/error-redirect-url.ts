import constants from "../../../constants/constants.js";
import getAvailableProviders from "../../../libs/auth-providers/get-available-providers.js";
import { AuthStatesRepository } from "../../../libs/repositories/index.js";
import T from "../../../translations/index.js";
import urlAddPath from "../../../utils/helpers/url-add-path.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * Gets the ideal redirect URL for when provider auth fails
 */
const authRedirectUrl: ServiceFn<
	[
		{
			providerKey: string;
			state: string;
		},
	],
	{
		redirectUrl: string;
	}
> = async (context, data) => {
	const AuthStates = new AuthStatesRepository(context.db, context.config.db);

	const baseRedirectUrl = urlAddPath(
		context.config.host,
		constants.authState.defaultErrorRedirectPath,
	);

	//* get provider config
	const availableProviders = getAvailableProviders(context.config);
	const provider = availableProviders.providers.find(
		(p) => p.key === data.providerKey,
	);
	if (!provider) {
		return {
			error: undefined,
			data: {
				redirectUrl: baseRedirectUrl,
			},
		};
	}

	//* retrieve and validate auth state
	const authStateRes = await AuthStates.selectSingleWithInvitation({
		state: data.state,
		validation: {
			enabled: true,
			defaultError: {
				status: 400,
				message: T("invalid_or_expired_state_message"),
			},
		},
	});
	if (authStateRes.error) {
		return {
			error: undefined,
			data: {
				redirectUrl: baseRedirectUrl,
			},
		};
	}

	if (authStateRes.data.action_type === constants.authState.actionTypes.login) {
		return {
			error: undefined,
			data: {
				redirectUrl: baseRedirectUrl,
			},
		};
	}

	if (
		authStateRes.data.action_type ===
			constants.authState.actionTypes.invitation &&
		authStateRes.data.invitation_token
	) {
		return {
			error: undefined,
			data: {
				redirectUrl: urlAddPath(
					context.config.host,
					`/admin/accept-invitation?token=${authStateRes.data.invitation_token}`,
				),
			},
		};
	}

	if (authStateRes.data.redirect_path) {
		return {
			error: undefined,
			data: {
				redirectUrl: urlAddPath(
					context.config.host,
					authStateRes.data.redirect_path,
				),
			},
		};
	}

	return {
		error: undefined,
		data: {
			redirectUrl: baseRedirectUrl,
		},
	};
};

export default authRedirectUrl;
