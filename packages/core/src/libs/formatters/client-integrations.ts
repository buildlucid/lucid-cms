import Formatter from "./index.js";
import type { ClientIntegrationResponse } from "../../types/response.js";
import type { BooleanInt } from "../db/types.js";

export interface ClientIntegrationProp {
	id: number;
	name: string;
	description: string | null;
	enabled: BooleanInt;
	key: string;
	created_at: Date | string | null;
	updated_at: Date | string | null;
}

export default class ClientIntegrationsFormatter {
	formatMultiple = (props: {
		integrations: ClientIntegrationProp[];
	}) => {
		return props.integrations.map((i) =>
			this.formatSingle({
				integration: i,
			}),
		);
	};
	formatSingle = (props: {
		integration: ClientIntegrationProp;
	}): ClientIntegrationResponse => {
		return {
			id: props.integration.id,
			key: props.integration.key,
			name: props.integration.name,
			description: props.integration.description,
			enabled: props.integration.enabled,
			createdAt: Formatter.formatDate(props.integration.created_at),
			updatedAt: Formatter.formatDate(props.integration.updated_at),
		};
	};
	static swagger = {
		type: "object",
		additionalProperties: true,
		properties: {
			id: {
				type: "number",
			},
			key: {
				type: "string",
			},
			name: {
				type: "string",
			},
			description: {
				type: "string",
			},
			enabled: {
				type: "number",
			},
			createdAt: {
				type: "string",
			},
			updatedAt: {
				type: "string",
			},
		},
	};
}
