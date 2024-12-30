import Repository from "../../libs/repositories/index.js";
import Formatter from "../../libs/formatters/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { ClientIntegrationResponse } from "../../types/response.js";

const getAll: ServiceFn<[], ClientIntegrationResponse[]> = async (context) => {
	const ClientIntegrationsRepo = Repository.get(
		"client-integrations",
		context.db,
		context.config.db,
	);
	const ClientIntegrationFormatter = Formatter.get("client-integrations");

	const integrationsRes = await ClientIntegrationsRepo.selectMultiple({
		select: [
			"id",
			"key",
			"name",
			"description",
			"enabled",
			"created_at",
			"updated_at",
		],
		where: [],
	});

	return {
		error: undefined,
		data: ClientIntegrationFormatter.formatMultiple({
			integrations: integrationsRes,
		}),
	};
};

export default getAll;
