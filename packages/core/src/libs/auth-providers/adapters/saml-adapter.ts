import { randomUUID } from "node:crypto";
import T from "../../../translations/index.js";
import type { SAMLAdapter, SAMLAuthConfig } from "../types.js";

const createSAMLAdapter = (config: SAMLAuthConfig): SAMLAdapter => {
	return {
		config,
		getAuthUrl: async (params) => {
			try {
				const requestId = `_${randomUUID()}`;
				const timestamp = new Date().toISOString();

				const samlRequest = `
					<samlp:AuthnRequest
						xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
						xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
						ID="${requestId}"
						Version="2.0"
						IssueInstant="${timestamp}"
						Destination="${config.entryPoint}"
						AssertionConsumerServiceURL="${params.redirectUri}">
						<saml:Issuer>${config.issuer}</saml:Issuer>
						<samlp:NameIDPolicy
							Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"
							AllowCreate="true"/>
					</samlp:AuthnRequest>
				`
					.replace(/\s+/g, " ")
					.trim();

				const encodedRequest = Buffer.from(samlRequest).toString("base64");

				const url = new URL(config.entryPoint);
				url.searchParams.set("SAMLRequest", encodedRequest);
				url.searchParams.set("RelayState", params.state);

				return {
					error: undefined,
					data: url.toString(),
				};
			} catch (err) {
				return {
					error: {
						type: "basic",
						status: 500,
						name: T("saml_failed_to_generate_auth_url_name"),
						message:
							err instanceof Error
								? err.message
								: T("saml_failed_to_generate_auth_url_message"),
					},
					data: undefined,
				};
			}
		},
		handleCallback: async () => {
			return {
				error: undefined,
				data: {
					providerUserId: "1",
					email: "user@example.com",
					firstName: "John",
					lastName: "Doe",
				},
			};
		},
	};
};

export default createSAMLAdapter;
