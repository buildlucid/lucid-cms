import T from "../../../translations/index.js";
import constants from "../../../constants/constants.js";
import { LucidAPIError } from "../../../utils/errors/index.js";
import serviceWrapper from "../../../utils/services/service-wrapper.js";
import type { FastifyRequest } from "fastify";

const clientAuthentication = async (request: FastifyRequest) => {
	const clientKey = request.headers[constants.headers.clientIntegrationKey];
	const apiKey = request.headers.authorization;

	if (!clientKey) {
		throw new LucidAPIError({
			type: "authorisation",
			message: T("client_integration_key_missing"),
			status: 401,
		});
	}
	if (!apiKey) {
		throw new LucidAPIError({
			type: "authorisation",
			message: T("client_integration_api_key_missing"),
			status: 401,
		});
	}

	const verifyApiKey = await serviceWrapper(
		request.server.services.clientIntegrations.verifyApiKey,
		{
			transaction: false,
			defaultError: {
				type: "authorisation",
				message: T("client_integration_error"),
				status: 401,
			},
		},
	)(
		{
			db: request.server.config.db.client,
			config: request.server.config,
			services: request.server.services,
		},
		{
			key: String(clientKey),
			apiKey: apiKey,
		},
	);
	if (verifyApiKey.error) throw new LucidAPIError(verifyApiKey.error);
	request.clientIntegrationAuth = verifyApiKey.data;
};

export default clientAuthentication;
