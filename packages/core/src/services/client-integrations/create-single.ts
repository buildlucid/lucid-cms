import { copy } from "../../libs/i18n/index.js";
import { getValidClientScopes } from "../../libs/permission/scopes.js";
import {
	ClientIntegrationScopesRepository,
	ClientIntegrationsRepository,
} from "../../libs/repositories/index.js";
import { encodeApiKey } from "../../utils/client-integrations/encode-api-key.js";
import generateKeys from "../../utils/client-integrations/generate-keys.js";
import type { ServiceFn } from "../../utils/services/types.js";

const createSingle: ServiceFn<
	[
		{
			name: string;
			description?: string;
			enabled?: boolean;
			scopes: string[];
		},
	],
	{
		apiKey: string;
	}
> = async (context, data) => {
	const scopes = [...new Set(data.scopes)];
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

	const ClientIntegrations = new ClientIntegrationsRepository(
		context.db.client,
		context.config.db,
	);
	const ClientIntegrationScopes = new ClientIntegrationScopesRepository(
		context.db.client,
		context.config.db,
	);

	const { key, apiKey, apiKeyHash, secret } = await generateKeys(
		context.config.secrets.encryption,
	);

	const keyExistsRes = await ClientIntegrations.selectSingle({
		select: ["id"],
		where: [
			{
				key: "key",
				operator: "=",
				value: key,
			},
		],
	});
	if (keyExistsRes.error) return keyExistsRes;

	if (keyExistsRes.data !== undefined) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.client.integrations.key.already.exists"),
				status: 400,
			},
			data: undefined,
		};
	}

	const newIntegrationRes = await ClientIntegrations.createSingle({
		data: {
			name: data.name,
			description: data.description,
			enabled: data.enabled !== undefined ? data.enabled : true,
			key: key,
			secret: secret,
			api_key: apiKeyHash,
			tenant_key: context.request.tenantKey ?? null,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		},
		returning: ["id", "api_key"],
		validation: {
			enabled: true,
		},
	});
	if (newIntegrationRes.error) return newIntegrationRes;

	if (scopes.length > 0) {
		const scopeInsertRes = await ClientIntegrationScopes.createMultiple({
			data: scopes.map((scope) => ({
				client_integration_id: newIntegrationRes.data.id,
				scope,
				core: true,
			})),
		});
		if (scopeInsertRes.error) return scopeInsertRes;
	}

	return {
		error: undefined,
		data: {
			apiKey: encodeApiKey(key, apiKey),
		},
	};
};

export default createSingle;
