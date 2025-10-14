import type { ClientIntegrationResponse } from "../../types/response.js";
import type { BooleanInt } from "../db-adapter/types.js";
import Formatter from "./index.js";

export interface ClientIntegrationQueryRes {
	id: number;
	name: string;
	description: string | null;
	enabled: BooleanInt;
	key: string;
	created_at: Date | string | null;
	updated_at: Date | string | null;
}

export default class ClientIntegrationsFormatter {
	formatMultiple = (props: { integrations: ClientIntegrationQueryRes[] }) => {
		return props.integrations.map((i) =>
			this.formatSingle({
				integration: i,
			}),
		);
	};
	formatSingle = (props: {
		integration: ClientIntegrationQueryRes;
	}): ClientIntegrationResponse => {
		return {
			id: props.integration.id,
			key: props.integration.key,
			name: props.integration.name,
			description: props.integration.description,
			enabled: Formatter.formatBoolean(props.integration.enabled),
			createdAt: Formatter.formatDate(props.integration.created_at),
			updatedAt: Formatter.formatDate(props.integration.updated_at),
		};
	};
}
