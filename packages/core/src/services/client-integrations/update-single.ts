import cacheKeys from "../../libs/kv-adapter/cache-keys.js";
import {
	ClientIntegrationScopesRepository,
	ClientIntegrationsRepository,
} from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

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

	const checkExistsRes = await ClientIntegrations.selectSingle({
		select: ["id", "key"],
		where: [
			{
				key: "id",
				operator: "=",
				value: data.id,
			},
		],
		validation: {
			enabled: true,
			defaultError: {
				message: T("client_integration_not_found_message"),
				status: 404,
			},
		},
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

	const cacheKey = cacheKeys.auth.client(checkExistsRes.data.key);
	await context.kv.delete(cacheKey, { hash: true });

	return {
		error: undefined,
		data: undefined,
	};
};

export default updateSingle;
