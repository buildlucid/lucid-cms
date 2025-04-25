import T from "../../../translations/index.js";
import toolkitWrapper from "../toolkit-wrapper.js";
import lucidServices from "../../../services/index.js";
import { toolkitSchemas } from "../../../schemas/documents.js";
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
				schema: toolkitSchemas.getSingle,
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
				schema: toolkitSchemas.getMultiple,
				defaultError: {
					name: T("route_document_fetch_error_name"),
				},
			},
		}),
};

export default documentToolkit;
