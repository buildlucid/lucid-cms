import Formatter from "./index.js";
import type { ClientIntegrationResponse } from "../../types/response.js";
import type { BooleanInt } from "../db/types.js";
import z from "zod";

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
			enabled: Formatter.formatBoolean(props.integration.enabled),
			createdAt: Formatter.formatDate(props.integration.created_at),
			updatedAt: Formatter.formatDate(props.integration.updated_at),
		};
	};

	static schema = z.object({
		id: z.number().meta({
			description: "The client integration ID",
			example: "26",
		}),
		key: z.string().meta({
			description:
				"A short unique key used to authenticate client query requests",
			example: "bd61bb",
		}),
		name: z.string().min(2).meta({
			description: "The name of the client",
			example: "Marketing Website",
		}),
		description: z.string().nullable().meta({
			description: "A description of the client",
			example: "The Astro marketing site at example.com",
		}),
		enabled: z.boolean().meta({
			description:
				"Whether or not the client is active. If inactive you wont be able to use it to query data",
			example: true,
		}),
		createdAt: z.string().nullable().meta({
			description: "The time the client integration was created",
			example: "2022-01-01T00:00:00Z",
		}),
		updatedAt: z.string().nullable().meta({
			description: "The time the client integration was last updated",
			example: "2022-01-01T00:00:00Z",
		}),
	});

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
				type: "boolean",
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
