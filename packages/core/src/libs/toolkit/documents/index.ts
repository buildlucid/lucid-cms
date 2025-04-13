import T from "../../../translations/index.js";
import z from "zod";
import toolkitWrapper from "../toolkit-wrapper.js";
import lucidServices from "../../../services/index.js";
import documentsSchema from "../../../schemas/documents.js";
import type { ExtractServiceFnArgs } from "../../../utils/services/types.js";

const documentToolkit = {
	getSingle: async (
		...data: ExtractServiceFnArgs<
			typeof lucidServices.collection.documents.client.getSingle
		>
	) =>
		toolkitWrapper({
			fn: lucidServices.collection.documents.client.getSingle,
			data: data,
			config: {
				transaction: false,
				schema: z.object({
					collectionKey: z.string(),
					query: documentsSchema.client.getSingle.query,
				}),
				defaultError: {
					name: T("route_document_fetch_error_name"),
				},
			},
		}),
	getMultiple: async (
		...data: ExtractServiceFnArgs<
			typeof lucidServices.collection.documents.client.getMultiple
		>
	) =>
		toolkitWrapper({
			fn: lucidServices.collection.documents.client.getMultiple,
			data: data,
			config: {
				transaction: false,
				schema: z.object({
					collectionKey: z.string(),
					query: documentsSchema.client.getMultiple.query,
				}),
				defaultError: {
					name: T("route_document_fetch_error_name"),
				},
			},
		}),
};

export default documentToolkit;
