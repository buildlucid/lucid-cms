import {
	ClientIntegrationScopesRepository,
	ClientIntegrationsRepository,
} from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import checkIntegrationAccess from "./checks/check-integration-access.js";

const updateSingle: ServiceFn<
	[
		{
			id: number;
			name?: string;
			description?: string;
			enabled?: boolean;
			scopes?: string[];
		},
	],
	undefined
> = async (context, data) => {
	const ClientIntegrations = new ClientIntegrationsRepository(
		context.db.client,
		context.config.db,
	);
	const ClientIntegrationScopes = new ClientIntegrationScopesRepository(
		context.db.client,
		context.config.db,
	);

	const checkExistsRes = await checkIntegrationAccess(context, {
		id: data.id,
	});
	if (checkExistsRes.error) return checkExistsRes;

	const updateRes = await ClientIntegrations.updateSingle({
		data: {
			name: data.name,
			description: data.description,
			enabled: data.enabled,
			updated_at: new Date().toISOString(),
		},
		where: [
			{
				key: "id",
				operator: "=",
				value: data.id,
			},
		],
		returning: ["id"],
		validation: {
			enabled: true,
		},
	});
	if (updateRes.error) return updateRes;

	if (data.scopes !== undefined) {
		const deleteScopesRes = await ClientIntegrationScopes.deleteMultiple({
			where: [
				{
					key: "client_integration_id",
					operator: "=",
					value: data.id,
				},
			],
			returning: ["id"],
			validation: {
				enabled: true,
			},
		});
		if (deleteScopesRes.error) return deleteScopesRes;

		if (data.scopes.length > 0) {
			const createScopesRes = await ClientIntegrationScopes.createMultiple({
				data: data.scopes.map((scope) => ({
					client_integration_id: data.id,
					scope,
					core: true,
				})),
			});
			if (createScopesRes.error) return createScopesRes;
		}
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default updateSingle;
