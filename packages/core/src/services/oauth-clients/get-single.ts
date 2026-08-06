import oauthClientsFormatter from "../../libs/formatters/oauth-clients.js";
import { OAuthClientsRepository } from "../../libs/repositories/index.js";
import type { OAuthClient } from "../../types/response.js";
import { getBaseUrl } from "../../utils/helpers/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const getSingle: ServiceFn<[{ id: number }], OAuthClient> = async (
	context,
	data,
) => {
	const OAuthClients = new OAuthClientsRepository(context.db);

	const clientRes = await OAuthClients.selectSingleDetailed({
		id: data.id,
		validation: {
			enabled: true,
			defaultError: {
				status: 404,
			},
		},
	});
	if (clientRes.error) return clientRes;

	return {
		error: undefined,
		data: oauthClientsFormatter.formatSingle({
			client: clientRes.data,
			host: getBaseUrl(context),
		}),
	};
};

export default getSingle;
