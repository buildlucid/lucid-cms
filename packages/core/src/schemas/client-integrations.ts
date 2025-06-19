import z from "zod/v4";
import type { ControllerSchema } from "../types.js";

export const clientIntegrationResponseSchema = z.object({
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

export const controllerSchemas = {
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
		response: z.array(clientIntegrationResponseSchema),
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
		response: clientIntegrationResponseSchema,
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
