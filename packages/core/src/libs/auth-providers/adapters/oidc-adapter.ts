import type { OIDCAdapter, OIDCAuthConfig } from "../types.js";
import T from "../../../translations/index.js";

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

				return {
					error: undefined,
					data: url.toString(),
				};
			} catch (err) {
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
	};
};

export default createOIDCAdapter;
