import z from "zod";
import ClientIntegrationsFormatter from "../libs/formatters/client-integrations.js";
import type { ControllerSchema } from "../types.js";

const schema = {
	createSingle: {
		body: z.object({
			name: z.string().min(2).meta({
				description: "The name of the client",
				example: "Marketing Website",
			}),
			description: z
				.string()
				.meta({
					description: "A description of the client",
					example: "The Astro marketing site at example.com",
				})
				.optional(),
			enabled: z
				.boolean()
				.meta({
					description:
						"Whether or not the client is active. If inactive you wont be able to use it to query data",
					example: true,
				})
				.optional(),
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: z.object({
			apiKey: z.string().meta({
				description:
					"A unique token used to authenticate client endpoint requests. You'll only ever see this value once so keep it safe",
				example:
					"3084d4531c41ca6db79f422a4426361176461667280556c333ffcff530486a1e",
			}),
		}),
	} satisfies ControllerSchema,
	deleteSingle: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			id: z.string().meta({
				description: "The client integration ID you want to delete",
				example: "1",
			}),
		}),
		response: undefined,
	} satisfies ControllerSchema,
	getAll: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: z.array(ClientIntegrationsFormatter.schema),
	} satisfies ControllerSchema,
	getSingle: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			id: z.string().meta({
				description: "The client integration ID",
				example: "1",
			}),
		}),
		response: ClientIntegrationsFormatter.schema,
	} satisfies ControllerSchema,
	regenerateKeys: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			id: z.string().meta({
				description: "The client integration ID",
				example: "1",
			}),
		}),
		response: z.object({
			apiKey: z.string().meta({
				description:
					"A unique token used to authenticate client endpoint requests. You'll only ever see this value once so keep it safe",
				example:
					"3084d4531c41ca6db79f422a4426361176461667280556c333ffcff530486a1e",
			}),
		}),
	} satisfies ControllerSchema,
	updateSingle: {
		body: z.object({
			name: z
				.string()
				.min(2)
				.meta({
					description: "The name of the client",
					example: "Marketing Website",
				})
				.optional(),
			description: z
				.string()
				.meta({
					description: "A description of the client",
					example: "The Astro marketing site at example.com",
				})
				.optional(),
			enabled: z
				.boolean()
				.meta({
					description:
						"Whether or not the client is active. If inactive you wont be able to use it to query data",
					example: true,
				})
				.optional(),
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			id: z.string().meta({
				description: "The client integration ID",
				example: "1",
			}),
		}),
		response: undefined,
	} satisfies ControllerSchema,
};

export default schema;
