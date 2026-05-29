import constants from "../../../constants/constants.js";
import logger from "../../../libs/logger/index.js";
import { text } from "../../i18n/index.js";
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
						name: text.server(
							"core.auth.oidc.failed.to.generate.auth.url.name",
						),
						message: text.server(
							"core.auth.oidc.failed.to.generate.auth.url.message",
							err instanceof Error
								? { defaultMessage: err.message }
								: undefined,
						),
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
							name: text.server("core.auth.oidc.token.exchange.failed.name"),
							message: text.server(
								"core.auth.oidc.token.exchange.failed.message",
								{
									data: {
										message: errorText,
									},
								},
							),
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
							name: text.server("core.auth.oidc.access.token.missing.name"),
							message: text.server(
								"core.auth.oidc.access.token.missing.message",
							),
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
							name: text.server("core.auth.oidc.user.info.fetch.failed.name"),
							message: text.server(
								"core.auth.oidc.user.info.fetch.failed.message",
								{
									data: {
										message: errorText,
									},
								},
							),
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
							name: text.server("core.auth.oidc.user.info.incomplete.name"),
							message: text.server(
								"core.auth.oidc.user.info.incomplete.message",
							),
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
						name: text.server("core.auth.oidc.callback.failed.name"),
						message: text.server(
							"core.auth.oidc.callback.failed.message",
							err instanceof Error
								? { defaultMessage: err.message }
								: undefined,
						),
					},
					data: undefined,
				};
			}
		},
	};
};

export default createOIDCAdapter;
