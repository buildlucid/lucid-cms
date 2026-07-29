import { integrationsFormatter } from "../../libs/formatters/index.js";
import { copy } from "../../libs/i18n/index.js";
import { IntegrationsRepository } from "../../libs/repositories/index.js";
import type { Integration } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";

/** Loads an integration. */
const getSingle: ServiceFn<
	[
		{
			id: number;
			userId: number | null;
		},
	],
	Integration
> = async (context, data) => {
	const Integrations = new IntegrationsRepository(
		context.db.client,
		context.config.db,
	);

	const integrationsRes = await Integrations.selectSingleByIdWithScopes({
		id: data.id,
		userId: data.userId,
		validation: {
			enabled: true,
			defaultError: {
				message: copy("server:core.integrations.not.found.message"),
				status: 404,
			},
		},
	});
	if (integrationsRes.error) return integrationsRes;

	return {
		error: undefined,
		data: integrationsFormatter.formatSingle(integrationsRes.data),
	};
};

export default getSingle;
