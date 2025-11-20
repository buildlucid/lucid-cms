import type { ClientIntegrationResponse } from "../../types/response.js";
import type { BooleanInt } from "../db-adapter/types.js";
import formatter from "./index.js";

export interface ClientIntegrationQueryRes {
	id: number;
	name: string;
	description: string | null;
	enabled: BooleanInt;
	key: string;
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
		createdAt: formatter.formatDate(props.integration.created_at),
		updatedAt: formatter.formatDate(props.integration.updated_at),
	};
};

export default {
	formatMultiple,
	formatSingle,
};
