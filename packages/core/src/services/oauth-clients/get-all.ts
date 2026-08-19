import oauthClientsFormatter from "../../libs/formatters/oauth-clients.js";
import { OAuthClientsRepository } from "../../libs/repositories/index.js";
import type { OAuthClient } from "../../types/response.js";
import { getBaseUrl } from "../../utils/helpers/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const getAll: ServiceFn<[], OAuthClient[]> = async (context) => {
	const OAuthClients = new OAuthClientsRepository(context.db);

	const clientsRes = await OAuthClients.selectMultipleDetailed({
		validation: {
			enabled: true,
		},
	});
	if (clientsRes.error) return clientsRes;

	return {
		error: undefined,
		data: clientsRes.data.map((client) =>
			oauthClientsFormatter.formatSingle({
				client,
				mediaOptions: {
					host: getBaseUrl(context),
					delivery: context.mediaDelivery,
					imagePresets: context.config.media.images.presets,
				},
			}),
		),
	};
};

export default getAll;
