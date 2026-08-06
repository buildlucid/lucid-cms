import { copy } from "../../../libs/i18n/index.js";
import { IntegrationsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * Loads an integration before a mutation.
 */
const checkIntegrationAccess: ServiceFn<
	[
		{
			id: number;
			userId: number | null;
		},
	],
	{
		id: number;
		key: string;
		user_id: number | null;
	}
> = async (context, data) => {
	const Integrations = new IntegrationsRepository(context.db);

	const integrationRes = await Integrations.selectSingleByIdWithScopes({
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
	if (integrationRes.error) return integrationRes;

	return {
		error: undefined,
		data: {
			id: integrationRes.data.id,
			key: integrationRes.data.key,
			user_id: integrationRes.data.user_id,
		},
	};
};

export default checkIntegrationAccess;
