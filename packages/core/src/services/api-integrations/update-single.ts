import { copy } from "../../libs/i18n/index.js";
import { getInvalidExternalScopes } from "../../libs/permission/scopes.js";
import {
	ApiIntegrationScopesRepository,
	ApiIntegrationsRepository,
} from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import checkIntegrationAccess from "./checks/check-integration-access.js";

/** Updates an API integration and its assigned scopes. */
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
	const scopes = data.scopes ? [...new Set(data.scopes)] : undefined;
	if (scopes !== undefined) {
		const invalidScopes = getInvalidExternalScopes(context.config, scopes, {
			tenantKey: context.request.tenantKey,
		});
		if (invalidScopes.length > 0) {
			return {
				error: {
					type: "basic",
					name: copy("server:core.client.integrations.scopes.error.name"),
					message: copy(
						"server:core.client.integrations.scopes.invalid.message",
						{ data: { invalidScopes: invalidScopes.join(", ") } },
					),
					status: 400,
				},
				data: undefined,
			};
		}
	}

	const ApiIntegrations = new ApiIntegrationsRepository(
		context.db.client,
		context.config.db,
	);
	const ApiIntegrationScopes = new ApiIntegrationScopesRepository(
		context.db.client,
		context.config.db,
	);

	const checkExistsRes = await checkIntegrationAccess(context, {
		id: data.id,
	});
	if (checkExistsRes.error) return checkExistsRes;

	const updateRes = await ApiIntegrations.updateSingle({
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

	if (scopes !== undefined) {
		const deleteScopesRes = await ApiIntegrationScopes.deleteMultiple({
			where: [
				{
					key: "api_integration_id",
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

		if (scopes.length > 0) {
			const createScopesRes = await ApiIntegrationScopes.createMultiple({
				data: scopes.map((scope) => ({
					api_integration_id: data.id,
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
