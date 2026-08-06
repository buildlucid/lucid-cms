import formatter from "../../../libs/formatters/index.js";
import { OAuthClientsRepository } from "../../../libs/repositories/index.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import {
	fetchOAuthClientMetadata,
	isLoopbackHostname,
} from "./client-metadata.js";

export type ResolvedOAuthAuthorizationClient = {
	clientId: string;
	clientName: string;
	clientUri: string | null;
	redirectUris: string[];
	logoMediaId: number | null;
};

export const resolveOAuthAuthorizationClient = async (
	context: ServiceContext,
	input: {
		clientId: string;
		allowedLoopbackHostname?: string;
	},
): ServiceResponse<ResolvedOAuthAuthorizationClient> => {
	const OAuthClients = new OAuthClientsRepository(context.db);

	const clientRes = await OAuthClients.selectSingleAuthorizationClient({
		clientId: input.clientId,
	});
	if (clientRes.error) return clientRes;

	if (clientRes.data) {
		if (!formatter.formatBoolean(clientRes.data.enabled)) {
			return {
				error: {
					type: "authorisation",
					code: "invalid_client",
					status: 400,
				},
				data: undefined,
			};
		}

		return {
			error: undefined,
			data: {
				clientId: input.clientId,
				clientName: clientRes.data.name,
				clientUri: clientRes.data.client_uri,
				redirectUris: clientRes.data.redirect_uris.map(
					(row) => row.redirect_uri,
				),
				logoMediaId: clientRes.data.logo_media_id,
			},
		};
	}

	const metadataRes = await fetchOAuthClientMetadata(input.clientId, {
		allowedLoopbackHostname: input.allowedLoopbackHostname,
	});
	if (metadataRes.error) return metadataRes;

	return {
		error: undefined,
		data: {
			clientId: metadataRes.data.client_id,
			clientName: metadataRes.data.client_name,
			clientUri: metadataRes.data.client_uri ?? null,
			redirectUris: metadataRes.data.redirect_uris,
			logoMediaId: null,
		},
	};
};

export const getAllowedOAuthLoopbackHostname = (baseUrl: URL) =>
	isLoopbackHostname(baseUrl.hostname) ? baseUrl.hostname : undefined;
