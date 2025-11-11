import constants from "../../../constants/constants.js";
import { logger } from "../../../index.js";
import T from "../../../translations/index.js";
import mapStandardUserInfo from "../helpers/default-user-info-mapper.js";
import type { OIDCAdapter, OIDCAuthConfig } from "../types.js";

const createOIDCAdapter = (config: OIDCAuthConfig): OIDCAdapter => {
	return {
		config,
		getAuthUrl: async (params) => {
			try {
				const scopes = config.scopes
					? config.scopes.join(" ")
					: "openid profile email";

				const url = new URL(config.authorizationEndpoint);
				url.searchParams.set("client_id", config.clientId);
				url.searchParams.set("response_type", "code");
				url.searchParams.set("redirect_uri", params.redirectUri);
				url.searchParams.set("state", params.state);
				url.searchParams.set("scope", scopes);

				if (config.additionalAuthParams) {
					for (const [key, value] of Object.entries(
						config.additionalAuthParams,
					)) {
						url.searchParams.set(key, value);
					}
				}

				logger.debug({
					scope: constants.logScopes.oidcAuth,
					message: `Generating OIDC auth URL for ${config.clientId}`,
					data: {
						authEndpoint: config.authorizationEndpoint,
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
					config.tokenEndpoint || `${config.issuer}/oauth2/token`;

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
						redirect_uri: params.redirectUri,
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

				const userinfoEndpoint =
					config.userinfoEndpoint || `${config.issuer}/oauth2/userinfo`;

				const userInfoResponse = await fetch(userinfoEndpoint, {
					headers: {
						Authorization: `Bearer ${accessToken}`,
						Accept: "application/json",
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

				const rawUserInfo = await userInfoResponse.json();

				logger.debug({
					scope: constants.logScopes.oidcAuth,
					message: "OIDC raw user info",
					data: rawUserInfo,
				});

				const userInfoRes = await (config.mappers?.userInfo
					? config.mappers.userInfo(rawUserInfo)
					: mapStandardUserInfo(rawUserInfo));
				if (userInfoRes.error) return userInfoRes;

				if (!userInfoRes.data.userId) {
					return {
						error: {
							status: 500,
							name: T("oidc_user_info_incomplete_name"),
							message: T("oidc_user_info_incomplete_message"),
						},
						data: undefined,
					};
				}

				return {
					error: undefined,
					data: {
						userId: String(userInfoRes.data.userId),
						firstName: userInfoRes.data.firstName,
						lastName: userInfoRes.data.lastName,
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
