import type { OAuthConnection } from "../../types/response.js";
import type { OAuthPrincipalType } from "../db/types.js";
import type { ExternalScope } from "../permission/external-scopes.js";
import formatter from "./index.js";

export type OAuthConnectionQueryRes = {
	id: number;
	name: string;
	client_id: string;
	client_name: string;
	client_uri: string | null;
	principal_type: OAuthPrincipalType;
	user_id: number | null;
	scopes: Array<{ scope: string }>;
	last_used_at: Date | string | null;
	last_used_ip: string | null;
	last_used_user_agent: string | null;
	created_at: Date | string;
	updated_at: Date | string | null;
};

/**
 * Formats an OAuth grant as an admin connection response.
 */
const formatSingle = (
	connection: OAuthConnectionQueryRes,
): OAuthConnection => ({
	id: connection.id,
	name: connection.name,
	clientId: connection.client_id,
	clientName: connection.client_name,
	clientUri: connection.client_uri,
	principalType: connection.principal_type,
	userId: connection.user_id,
	scopes: connection.scopes.map((scope) => scope.scope as ExternalScope),
	lastUsedAt: formatter.formatDate(connection.last_used_at),
	lastUsedIp: connection.last_used_ip,
	lastUsedUserAgent: connection.last_used_user_agent,
	createdAt: formatter.formatDate(connection.created_at) ?? "",
	updatedAt: formatter.formatDate(connection.updated_at),
});

/**
 * Formats OAuth grants as admin connection responses.
 */
const formatMultiple = (connections: OAuthConnectionQueryRes[]) =>
	connections.map(formatSingle);

export default {
	formatSingle,
	formatMultiple,
};
