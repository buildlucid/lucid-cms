import { copy } from "../../libs/i18n/index.js";
import { getInvalidExternalScopes } from "../../libs/permission/scopes.js";
import {
	ApiIntegrationScopesRepository,
	ApiIntegrationsRepository,
} from "../../libs/repositories/index.js";
import { encodeApiKey } from "../../utils/api-integrations/encode-api-key.js";
import generateKeys from "../../utils/api-integrations/generate-keys.js";
import type { ServiceFn } from "../../utils/services/types.js";

/** Creates an API integration and returns its one-time credential. */
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

	const ApiIntegrations = new ApiIntegrationsRepository(
		context.db.client,
		context.config.db,
	);
	const ApiIntegrationScopes = new ApiIntegrationScopesRepository(
		context.db.client,
		context.config.db,
	);

	const { key, apiKey, apiKeyHash, secret } = await generateKeys(
		context.config.secrets.encryption,
	);

	const keyExistsRes = await ApiIntegrations.selectSingle({
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

	const newIntegrationRes = await ApiIntegrations.createSingle({
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
		const scopeInsertRes = await ApiIntegrationScopes.createMultiple({
			data: scopes.map((scope) => ({
				api_integration_id: newIntegrationRes.data.id,
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
