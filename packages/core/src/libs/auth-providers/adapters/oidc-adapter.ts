import constants from "../../../constants/constants.js";
import { logger } from "../../../index.js";
import T from "../../../translations/index.js";
import type { OIDCAdapter, OIDCAuthConfig } from "../types.js";

const createOIDCAdapter = (config: OIDCAuthConfig): OIDCAdapter => {
	return {
		config,
		getAuthUrl: async (params) => {
			try {
				const authEndpoint =
					config.authorizationEndpoint ||
					`${config.issuer}/oauth2/v2.0/authorize`;

				const scopes = config.scopes
					? config.scopes.join(" ")
					: "openid profile email";

				const url = new URL(authEndpoint);
				url.searchParams.set("client_id", config.clientId);
				url.searchParams.set("response_type", "code");
				url.searchParams.set("redirect_uri", params.redirectUri);
				url.searchParams.set("state", params.state);
				url.searchParams.set("scope", scopes);

				logger.debug({
					scope: constants.logScopes.oidcAuth,
					message: `Generating OIDC auth URL for ${config.clientId}`,
					data: {
						authEndpoint,
						scopes,
						redirectUri: params.redirectUri,
						state: params.state,
					},
				});

				return {
					error: undefined,
					data: url.toString(),
				};
			} catch (err) {
				logger.error({
					scope: constants.logScopes.oidcAuth,
					message: `Failed to generate OIDC auth URL for ${config.clientId}`,
					data: {
						redirectUri: params.redirectUri,
						state: params.state,
					},
				});
				return {
					error: {
						type: "basic",
						status: 500,
						name: T("oidc_failed_to_generate_auth_url_name"),
						message:
							err instanceof Error
								? err.message
								: T("oidc_failed_to_generate_auth_url_message"),
					},
					data: undefined,
				};
			}
		},
		handleCallback: async (params) => {
			try {
				const tokenEndpoint =
					config.tokenEndpoint || `${config.issuer}/oauth2/v2.0/token`;

				const tokenResponse = await fetch(tokenEndpoint, {
					method: "POST",
					headers: {
						"Content-Type": "application/x-www-form-urlencoded",
						Accept: "application/json",
					},
					body: new URLSearchParams({
						client_id: config.clientId,
						client_secret: config.clientSecret,
						code: params.code,
						grant_type: "authorization_code",
					}),
				});
				if (!tokenResponse.ok) {
					const errorText = await tokenResponse.text();
					return {
						error: {
							type: "basic",
							status: tokenResponse.status,
							name: T("oidc_token_exchange_failed_name"),
							message: T("oidc_token_exchange_failed_message", {
								message: errorText,
							}),
						},
						data: undefined,
					};
				}

				const tokenData = await tokenResponse.json();
				console.log("tokenData", tokenData);
				const accessToken = tokenData.access_token;
				if (!accessToken) {
					return {
						error: {
							type: "basic",
							status: 500,
							name: T("oidc_access_token_missing_name"),
							message: T("oidc_access_token_missing_message"),
						},
						data: undefined,
					};
				}

				//* fetch user information using access token
				const userinfoEndpoint =
					config.userinfoEndpoint || `${config.issuer}/oauth2/v2.0/userinfo`;

				const userInfoResponse = await fetch(userinfoEndpoint, {
					headers: {
						Authorization: `Bearer ${accessToken}`,
					},
				});
				if (!userInfoResponse.ok) {
					const errorText = await userInfoResponse.text();
					return {
						error: {
							type: "basic",
							status: userInfoResponse.status,
							name: T("oidc_user_info_fetch_failed_name"),
							message: T("oidc_user_info_fetch_failed_message", {
								message: errorText,
							}),
						},
						data: undefined,
					};
				}

				const userInfo = await userInfoResponse.json();
				console.log("userInfo", userInfo);
				logger.debug({
					scope: constants.logScopes.oidcAuth,
					message: "OIDC user info",
					data: userInfo,
				});

				const providerUserId = userInfo.sub || userInfo.id;
				const email = userInfo.email;

				if (!providerUserId || !email) {
					return {
						error: {
							type: "basic",
							status: 500,
							name: T("oidc_user_info_fetch_failed_name"),
							message: T("oidc_user_info_fetch_failed_message"),
						},
						data: undefined,
					};
				}

				return {
					error: undefined,
					data: {
						providerUserId,
						email,
						firstName: userInfo.given_name || userInfo.first_name,
						lastName: userInfo.family_name || userInfo.last_name,
					},
				};
			} catch (err) {
				return {
					error: {
						type: "basic",
						status: 500,
						name: T("oidc_callback_failed_name"),
						message:
							err instanceof Error
								? err.message
								: T("oidc_callback_failed_message"),
					},
					data: undefined,
				};
			}
		},
	};
};

export default createOIDCAdapter;
