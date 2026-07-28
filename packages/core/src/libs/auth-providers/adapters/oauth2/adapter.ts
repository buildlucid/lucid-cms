import constants from "../../../../constants/constants.js";
import logger from "../../../../libs/logger/index.js";
import { copy } from "../../../i18n/index.js";
import type { OAuth2Adapter, OAuth2AuthConfig } from "../../types.js";
import {
	buildAuthorizationUrl,
	exchangeAuthorizationCode,
	fetchProviderUserInfo,
	mapProviderUserInfo,
} from "./helpers.js";

/** Creates the adapter used by a generic OAuth 2.0 auth provider. */
const createOAuth2Adapter = (config: OAuth2AuthConfig): OAuth2Adapter => {
	return {
		config,
		getAuthUrl: async (params) => {
			const authorizationUrl = await buildAuthorizationUrl(config, params, []);
			if (authorizationUrl.error) {
				logger.error({
					error: authorizationUrl.error.cause ?? authorizationUrl.error,
					event: "oauth2.authorization-url.failed",
					scope: constants.logScopes.authProvider,
					message: `Failed to generate OAuth 2.0 auth URL for ${config.clientId}`,
				});

				return {
					error: {
						type: "basic",
						status: authorizationUrl.error.status,
						name: copy(
							"server:core.auth.oauth2.failed.to.generate.auth.url.name",
						),
						message: copy(
							"server:core.auth.oauth2.failed.to.generate.auth.url.message",
						),
					},
					data: undefined,
				};
			}

			return authorizationUrl;
		},
		handleCallback: async (params) => {
			const tokenResponse = await exchangeAuthorizationCode(config, params);
			if (tokenResponse.error) {
				return {
					error: {
						type: "basic",
						status: tokenResponse.error.status,
						name: copy("server:core.auth.oauth2.token.exchange.failed.name"),
						message: copy(
							"server:core.auth.oauth2.token.exchange.failed.message",
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

			if (!tokenResponse.data.access_token) {
				return {
					error: {
						type: "basic",
						status: 502,
						name: copy("server:core.auth.oauth2.access.token.missing.name"),
						message: copy(
							"server:core.auth.oauth2.access.token.missing.message",
						),
					},
					data: undefined,
				};
			}

			const userInfo = await fetchProviderUserInfo(
				config.userinfoEndpoint,
				tokenResponse.data.access_token,
			);
			if (userInfo.error) {
				return {
					error: {
						type: "basic",
						status: userInfo.error.status,
						name: copy("server:core.auth.oauth2.user.info.fetch.failed.name"),
						message: copy(
							"server:core.auth.oauth2.user.info.fetch.failed.message",
						),
					},
					data: undefined,
				};
			}

			const mapped = await mapProviderUserInfo(
				userInfo.data,
				config.mappers?.userInfo,
			);
			if (mapped.error) return mapped;

			return {
				error: undefined,
				data: {
					userId: String(mapped.data.userId),
					firstName: mapped.data.firstName,
					lastName: mapped.data.lastName,
				},
			};
		},
	};
};

export default createOAuth2Adapter;
