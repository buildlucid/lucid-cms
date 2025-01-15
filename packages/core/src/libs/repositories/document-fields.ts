import z from "zod";
import DynamicRepository, {
	type PrepareQueryConfig,
} from "./parents/dynamic-repository.js";

export default class DocumentFieldsRepository extends DynamicRepository<"lucid_document__collection-key__fields"> {
	baseTableSchema = z.object({
		id: z.number(),
		collection_key: z.string(),
		document_id: z.number(),
		document_version_id: z.number(),
		locale: z.string(),
		// repeater specific
		parent_id: z.string().optional(),
		sort_order: z.number().optional(),
		// plus unlimited* dynamic columns
	});
	baseColumnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		collection_key: this.dbAdapter.getDataType("text"),
		document_id: this.dbAdapter.getDataType("integer"),
		document_version_id: this.dbAdapter.getDataType("integer"),
		locale: this.dbAdapter.getDataType("text"),
		// repeater specific
		parent_id: this.dbAdapter.getDataType("integer"),
		sort_order: this.dbAdapter.getDataType("integer"),
		// plus unlimited* dynamic columns
	};
	queryConfig = undefined;

	async exampleQuery(
		config: PrepareQueryConfig<"lucid_document__collection-key__fields">,
	) {
		this.prepareQuery(config);
	}
}
