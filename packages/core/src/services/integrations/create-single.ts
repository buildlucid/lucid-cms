import { copy } from "../../libs/i18n/index.js";
import type { ExternalScope } from "../../libs/permission/external-scopes.js";
import { getInvalidExternalScopes } from "../../libs/permission/scopes.js";
import {
	IntegrationScopesRepository,
	IntegrationsRepository,
} from "../../libs/repositories/index.js";
import type { IntegrationExpiry } from "../../schemas/integrations.js";
import { encodeApiKey } from "../../utils/integrations/encode-api-key.js";
import generateKeys from "../../utils/integrations/generate-keys.js";
import getExpiryDate from "../../utils/integrations/get-expiry-date.js";
import type { ServiceFn } from "../../utils/services/types.js";
import resolveUserAuthority from "./resolve-user-authority.js";

/** Creates an integration and returns its one-time credential. */
const createSingle: ServiceFn<
	[
		{
			name: string;
			description?: string;
			enabled?: boolean;
			expiry: IntegrationExpiry;
			scopes: string[];
			userId: number | null;
		},
	],
	{
		apiKey: string;
	}
> = async (context, data) => {
	const scopes = [...new Set(data.scopes)];
	const invalidScopes = getInvalidExternalScopes(context.config, scopes);
	if (invalidScopes.length > 0) {
		return {
			error: {
				type: "basic",
				name: copy("server:core.integrations.scopes.error.name"),
				message: copy("server:core.integrations.scopes.invalid.message", {
					data: { invalidScopes: invalidScopes.join(", ") },
				}),
				status: 400,
			},
			data: undefined,
		};
	}

	if (data.userId !== null) {
		const authority = await resolveUserAuthority(context, {
			userId: data.userId,
			scopes: scopes as ExternalScope[],
		});
		if (authority.error) return authority;

		const unavailableScopes = scopes.filter(
			(scope) => !authority.data.scopes.includes(scope as ExternalScope),
		);
		if (unavailableScopes.length > 0) {
			return {
				error: {
					type: "basic",
					name: copy("server:core.integrations.scopes.error.name"),
					message: copy("server:core.integrations.scopes.invalid.message", {
						data: { invalidScopes: unavailableScopes.join(", ") },
					}),
					status: 400,
				},
				data: undefined,
			};
		}
	}

	const Integrations = new IntegrationsRepository(
		context.db.client,
		context.config.db,
	);
	const IntegrationScopes = new IntegrationScopesRepository(
		context.db.client,
		context.config.db,
	);

	const { key, apiKey, apiKeyHash, secret } = await generateKeys(
		context.config.secrets.encryption,
	);

	const keyExistsRes = await Integrations.selectSingle({
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
				message: copy("server:core.integrations.key.already.exists"),
				status: 400,
			},
			data: undefined,
		};
	}

	const now = new Date();
	const newIntegrationRes = await Integrations.createSingle({
		data: {
			name: data.name,
			description: data.description,
			enabled: data.enabled !== undefined ? data.enabled : true,
			user_id: data.userId,
			expires_at: getExpiryDate(data.expiry, now) ?? undefined,
			key: key,
			secret: secret,
			api_key: apiKeyHash,
			created_at: now.toISOString(),
			updated_at: now.toISOString(),
		},
		returning: ["id"],
		validation: {
			enabled: true,
		},
	});
	if (newIntegrationRes.error) return newIntegrationRes;

	if (scopes.length > 0) {
		const scopeInsertRes = await IntegrationScopes.createMultiple({
			data: scopes.map((scope) => ({
				integration_id: newIntegrationRes.data.id,
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
