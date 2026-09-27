import { defineAgentTool, z } from "@lucidcms/core";

export const documentPickerData = z.object({
	documents: z.array(z.object({ id: z.number().int(), label: z.string() })),
});
const documentPickerResponse = z.object({
	documentId: z.number().int(),
});

export const selectDocumentTool = defineAgentTool({
	name: "playground_select_document",
	title: "Select document",
	description:
		"Look up page documents and let the user select one. Use inline or composer placement as requested.",
	input: z.object({
		placement: z.enum(["inline", "composer"]).default("inline"),
	}),
	output: z.object({ documentId: z.number().nullable() }),
	permissions: ["documents:page:read"],
	readOnly: true,
	interaction: {
		key: "playground-document-picker",
		version: 1,
		data: documentPickerData,
		response: (data) =>
			documentPickerResponse.refine((response) =>
				data.documents.some((document) => document.id === response.documentId),
			),
		prepare: async ({ context, input, toolkit }) => {
			const result = await toolkit.documents.getMultiple({
				collectionKey: "page",
				version: "latest",
				query: { perPage: 20 },
			});
			if (result.error) return result;
			if (!result.data.documents.length) {
				return { error: undefined, data: { output: { documentId: null } } };
			}

			return {
				error: undefined,
				data: {
					interaction: {
						title: context.translate("server:playground.document-picker.title"),
						placement: input.placement,
						data: {
							documents: result.data.documents.map((document) => {
								const field = document.fields.page_title;
								const titles =
									typeof field === "string"
										? [field]
										: field && typeof field === "object"
											? Object.values(field)
											: [];
								const title = titles.find(
									(value): value is string =>
										typeof value === "string" && value.trim().length > 0,
								);
								return {
									id: document.id,
									label:
										title ??
										context.translate(
											"server:playground.document-picker.label",
											{ data: { id: document.id } },
										),
								};
							}),
						},
					},
				},
			};
		},
	},
	handler: async ({ response, toolkit }) => {
		const result = await toolkit.documents.getSingle({
			collectionKey: "page",
			version: "latest",
			query: { filter: { id: { value: response.documentId, operator: "=" } } },
		});
		if (result.error) return result;
		return {
			error: undefined,
			data: { output: { documentId: result.data.document.id } },
		};
	},
});
