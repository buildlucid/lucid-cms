import type { Integration } from "../../types/response.js";
import type { BooleanInt } from "../db/types.js";
import type { ExternalScope } from "../permission/external-scopes.js";
import formatter from "./index.js";

export interface IntegrationQueryRes {
	id: number;
	name: string;
	description: string | null;
	enabled: BooleanInt;
	user_id: number | null;
	expires_at: Date | string | null;
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
 * Formats an integration for an admin response.
 */
const formatSingle = (integration: IntegrationQueryRes): Integration => {
	return {
		id: integration.id,
		key: integration.key,
		name: integration.name,
		description: integration.description,
		enabled: formatter.formatBoolean(integration.enabled),
		userId: integration.user_id,
		expiresAt: formatter.formatDate(integration.expires_at),
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
 * Formats integrations for an admin response.
 */
const formatMultiple = (integrations: IntegrationQueryRes[]) =>
	integrations.map(formatSingle);

export default {
	formatMultiple,
	formatSingle,
};
