import { copy } from "../../libs/i18n/index.js";
import type { ExternalScope } from "../../libs/permission/external-scopes.js";
import { getInvalidExternalScopes } from "../../libs/permission/scopes.js";
import {
	IntegrationScopesRepository,
	IntegrationsRepository,
} from "../../libs/repositories/index.js";
import type { IntegrationExpiry } from "../../schemas/integrations.js";
import getExpiryDate from "../../utils/integrations/get-expiry-date.js";
import type { ServiceFn } from "../../utils/services/types.js";
import checkIntegrationAccess from "./checks/check-integration-access.js";
import resolveUserAuthority from "./resolve-user-authority.js";

/** Updates an integration and its assigned scopes. */
const updateSingle: ServiceFn<
	[
		{
			id: number;
			name?: string;
			description?: string;
			enabled?: boolean;
			expiry?: IntegrationExpiry;
			scopes?: string[];
			userId: number | null;
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
					name: copy("server:core.integrations.scopes.error.name"),
					message: copy("server:core.integrations.scopes.invalid.message", {
						data: { invalidScopes: invalidScopes.join(", ") },
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

	const checkExistsRes = await checkIntegrationAccess(context, {
		id: data.id,
		userId: data.userId,
	});
	if (checkExistsRes.error) return checkExistsRes;

	if (scopes !== undefined && data.userId !== null) {
		const authority = await resolveUserAuthority(context, {
			userId: data.userId,
			tenantKey: checkExistsRes.data.tenant_key,
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

	const updateRes = await Integrations.updateSingle({
		data: {
			name: data.name,
			description: data.description,
			enabled: data.enabled,
			expires_at:
				data.expiry === undefined ? undefined : getExpiryDate(data.expiry),
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
		const deleteScopesRes = await IntegrationScopes.deleteMultiple({
			where: [
				{
					key: "integration_id",
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
			const createScopesRes = await IntegrationScopes.createMultiple({
				data: scopes.map((scope) => ({
					integration_id: data.id,
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
