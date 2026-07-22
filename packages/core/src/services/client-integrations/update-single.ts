import { copy } from "../../libs/i18n/index.js";
import { getValidClientScopes } from "../../libs/permission/scopes.js";
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
	const scopes = data.scopes ? [...new Set(data.scopes)] : undefined;
	if (scopes !== undefined) {
		const validScopes = new Set<string>(
			getValidClientScopes(context.config, {
				tenantKey: context.request.tenantKey,
			}),
		);
		const invalidScopes = scopes.filter((scope) => !validScopes.has(scope));
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

	if (scopes !== undefined) {
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

		if (scopes.length > 0) {
			const createScopesRes = await ClientIntegrationScopes.createMultiple({
				data: scopes.map((scope) => ({
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
