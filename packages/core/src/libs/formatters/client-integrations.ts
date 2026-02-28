import type { ClientIntegrationResponse } from "../../types/response.js";
import type { BooleanInt } from "../db-adapter/types.js";
import type { ClientScope } from "../permission/client-scopes.js";
import formatter from "./index.js";

export interface ClientIntegrationQueryRes {
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

const formatMultiple = (props: {
	integrations: ClientIntegrationQueryRes[];
}) => {
	return props.integrations.map((i) =>
		formatSingle({
			integration: i,
		}),
	);
};

const formatSingle = (props: {
	integration: ClientIntegrationQueryRes;
}): ClientIntegrationResponse => {
	return {
		id: props.integration.id,
		key: props.integration.key,
		name: props.integration.name,
		description: props.integration.description,
		enabled: formatter.formatBoolean(props.integration.enabled),
		scopes: (props.integration.scopes || []).map((s) => s.scope as ClientScope),
		lastUsedAt: formatter.formatDate(props.integration.last_used_at),
		lastUsedIp: props.integration.last_used_ip,
		lastUsedUserAgent: props.integration.last_used_user_agent,
		createdAt: formatter.formatDate(props.integration.created_at),
		updatedAt: formatter.formatDate(props.integration.updated_at),
	};
};

export default {
	formatMultiple,
	formatSingle,
};
