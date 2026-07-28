import type { ApiIntegration } from "../../types/response.js";
import type { BooleanInt } from "../db/types.js";
import type { ExternalScope } from "../permission/external-scopes.js";
import formatter from "./index.js";

export interface ApiIntegrationQueryRes {
	id: number;
	name: string;
	description: string | null;
	enabled: BooleanInt;
	scopes: Array<{
		scope: string;
	}>;
	key: string;
	last_used_at: Date | string | null;
	last_used_ip: string | null;
	last_used_user_agent: string | null;
	created_at: Date | string | null;
	updated_at: Date | string | null;
}

/**
 * Formats an API integration for an admin response.
 */
const formatSingle = (integration: ApiIntegrationQueryRes): ApiIntegration => {
	return {
		id: integration.id,
		key: integration.key,
		name: integration.name,
		description: integration.description,
		enabled: formatter.formatBoolean(integration.enabled),
		scopes: (integration.scopes || []).map(
			(scope) => scope.scope as ExternalScope,
		),
		lastUsedAt: formatter.formatDate(integration.last_used_at),
		lastUsedIp: integration.last_used_ip,
		lastUsedUserAgent: integration.last_used_user_agent,
		createdAt: formatter.formatDate(integration.created_at),
		updatedAt: formatter.formatDate(integration.updated_at),
	};
};

/**
 * Formats API integrations for an admin response.
 */
const formatMultiple = (integrations: ApiIntegrationQueryRes[]) =>
	integrations.map(formatSingle);

export default {
	formatMultiple,
	formatSingle,
};
