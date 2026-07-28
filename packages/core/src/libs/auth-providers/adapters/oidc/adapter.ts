import constants from "../../../../constants/constants.js";
import logger from "../../../../libs/logger/index.js";
import { copy } from "../../../i18n/index.js";
import type { OIDCAdapter, OIDCAuthConfig } from "../../types.js";
import {
	buildAuthorizationUrl,
	exchangeAuthorizationCode,
	fetchProviderUserInfo,
	mapProviderUserInfo,
} from "../oauth2/helpers.js";
import { resolveEndpoints, verifyIdToken } from "./helpers.js";

const createOIDCAdapter = (config: OIDCAuthConfig): OIDCAdapter => {
	return {
		config,
		getAuthUrl: async (params) => {
			const scopes = config.scopes
				? [...new Set(["openid", ...config.scopes])]
				: ["openid", "profile", "email"];
			const authorizationUrl = await buildAuthorizationUrl(
				{ ...config, scopes },
				params,
				scopes,
			);
			if (authorizationUrl.error) {
				logger.error({
					error: authorizationUrl.error.cause ?? authorizationUrl.error,
					event: "oidc.authorization-url.failed",
					scope: constants.logScopes.authProvider,
					message: `Failed to generate OIDC auth URL for ${config.clientId}`,
				});

				return {
					error: {
						type: "basic",
						status: authorizationUrl.error.status,
						name: copy(
							"server:core.auth.oidc.failed.to.generate.auth.url.name",
						),
						message: copy(
							"server:core.auth.oidc.failed.to.generate.auth.url.message",
						),
					},
					data: undefined,
				};
			}

			return authorizationUrl;
		},
		handleCallback: async (params) => {
			if (!params.nonce) {
				return {
					error: {
						type: "basic",
						status: 400,
						name: copy("server:core.auth.oidc.callback.failed.name"),
						message: copy("server:core.auth.oidc.callback.failed.message"),
					},
					data: undefined,
				};
			}

			const endpoints = await resolveEndpoints(config);
			if (endpoints.error) {
				logger.error({
					error: endpoints.error.cause ?? endpoints.error,
					event: "oidc.discovery.failed",
					scope: constants.logScopes.authProvider,
					message: `OIDC discovery failed for ${config.clientId}`,
				});
				return {
					error: {
						type: "basic",
						status: endpoints.error.status,
						name: copy("server:core.auth.oidc.callback.failed.name"),
						message: copy("server:core.auth.oidc.callback.failed.message"),
					},
					data: undefined,
				};
			}

			const tokenResponse = await exchangeAuthorizationCode(
				{ ...config, tokenEndpoint: endpoints.data.tokenEndpoint },
				params,
			);
			if (tokenResponse.error) {
				return {
					error: {
						type: "basic",
						status: tokenResponse.error.status,
						name: copy("server:core.auth.oidc.token.exchange.failed.name"),
						message: copy(
							"server:core.auth.oidc.token.exchange.failed.message",
							{
								data: {
									message:
										typeof tokenResponse.error.cause === "string"
											? tokenResponse.error.cause
											: `HTTP ${tokenResponse.error.status}`,
								},
							},
						),
					},
					data: undefined,
				};
			}

			if (!tokenResponse.data.id_token) {
				return {
					error: {
						type: "basic",
						status: 502,
						name: copy("server:core.auth.oidc.id.token.missing.name"),
						message: copy("server:core.auth.oidc.id.token.missing.message"),
					},
					data: undefined,
				};
			}

			const verified = await verifyIdToken(
				tokenResponse.data.id_token,
				config,
				endpoints.data,
				params.nonce,
			);
			if (verified.error) {
				logger.error({
					error: verified.error.cause ?? verified.error,
					event: "oidc.id-token.failed",
					scope: constants.logScopes.authProvider,
					message: `OIDC ID token validation failed for ${config.clientId}`,
				});
				return {
					error: {
						type: "basic",
						status: verified.error.status,
						name: copy("server:core.auth.oidc.callback.failed.name"),
						message: copy("server:core.auth.oidc.callback.failed.message"),
					},
					data: undefined,
				};
			}

			const claims = verified.data.claims;
			let rawUserInfo = claims;
			if (endpoints.data.userinfoEndpoint) {
				if (!tokenResponse.data.access_token) {
					return {
						error: {
							type: "basic",
							status: 502,
							name: copy("server:core.auth.oidc.callback.failed.name"),
							message: copy("server:core.auth.oidc.callback.failed.message"),
						},
						data: undefined,
					};
				}

				const userInfo = await fetchProviderUserInfo(
					endpoints.data.userinfoEndpoint,
					tokenResponse.data.access_token,
				);
				if (userInfo.error) {
					return {
						error: {
							type: "basic",
							status: userInfo.error.status,
							name: copy("server:core.auth.oidc.user.info.fetch.failed.name"),
							message: copy(
								"server:core.auth.oidc.user.info.fetch.failed.message",
							),
						},
						data: undefined,
					};
				}
				if (userInfo.data.sub !== claims.sub) {
					return {
						error: {
							type: "basic",
							status: 401,
							name: copy("server:core.auth.oidc.callback.failed.name"),
							message: copy("server:core.auth.oidc.callback.failed.message"),
						},
						data: undefined,
					};
				}
				rawUserInfo = userInfo.data;
			}

			const mapped = await mapProviderUserInfo(
				rawUserInfo,
				config.mappers?.userInfo,
			);
			if (mapped.error) return mapped;

			return {
				error: undefined,
				data: {
					userId: `${claims.iss}|${String(mapped.data.userId)}`,
					firstName: mapped.data.firstName,
					lastName: mapped.data.lastName,
				},
			};
		},
	};
};

export default createOIDCAdapter;
