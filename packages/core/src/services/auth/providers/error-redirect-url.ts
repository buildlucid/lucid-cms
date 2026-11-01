import constants from "../../../constants/constants.js";
import getAvailableProviders from "../../../libs/auth-providers/get-available-providers.js";
import { copy } from "../../../libs/i18n/index.js";
import { AuthStatesRepository } from "../../../libs/repositories/index.js";
import { decrypt } from "../../../utils/helpers/encrypt-decrypt.js";
import { getBaseUrl } from "../../../utils/helpers/index.js";
import urlAddPath from "../../../utils/helpers/url-add-path.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** Builds the redirect URL for a failed provider login. */
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
	const AuthStates = new AuthStatesRepository(context.db);

	const baseUrl = getBaseUrl(context);

	const baseRedirectUrl = urlAddPath(
		baseUrl,
		constants.authState.defaultErrorRedirectPath,
	);

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

	const authStateRes = await AuthStates.selectSingleWithInvitation({
		state: data.state,
		providerKey: data.providerKey,
		now: new Date().toISOString(),
		validation: {
			enabled: true,
			defaultError: {
				status: 400,
				message: copy("server:core.invalid.or.expired.state.message"),
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
		const invitationToken = decrypt(
			authStateRes.data.invitation_token,
			context.config.secrets.encryption,
		);
		return {
			error: undefined,
			data: {
				redirectUrl: urlAddPath(
					baseUrl,
					`${constants.paths.admin}/accept-invitation?token=${invitationToken}`,
				),
			},
		};
	}

	if (authStateRes.data.redirect_path) {
		return {
			error: undefined,
			data: {
				redirectUrl: urlAddPath(baseUrl, authStateRes.data.redirect_path),
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
