import type CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import collections from "../../../libs/collection/collections.js";
import type { FieldAccessActor } from "../../../libs/collection/field-access/types.js";
import { getBricksTableSchema } from "../../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import type { BrickInputSchema } from "../../../schemas/collection-bricks.js";
import type { FieldInputSchema } from "../../../schemas/collection-fields.js";
import type { Refs } from "../../../types/response.js";
import { getBaseUrl } from "../../../utils/helpers/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import collectContentRefTargets from "./collect-content-ref-targets.js";
import resolveDocumentRefs from "./resolve-document-refs.js";

/** Resolves refs from admin save content so editors can display resources they haven't loaded, eg. media added by an agent. */
const resolveContentRefs: ServiceFn<
	[
		{
			collection: CollectionBuilder;
			content: { fields: FieldInputSchema[]; bricks: BrickInputSchema[] };
			/** Leaves out related documents' fields this reader can't see. */
			reader?: FieldAccessActor;
		},
	],
	Refs
> = async (context, data) => {
	const targets = collectContentRefTargets(data.collection, data.content);
	if (targets.length === 0) return { error: undefined, data: {} };

	const [collectionRes, collectionsRes, schemaRes] = await Promise.all([
		collections.getSingle(context, { key: data.collection.key }),
		collections.getAll(context, {}),
		getBricksTableSchema(context, data.collection.key),
	]);
	if (collectionRes.error) return collectionRes;
	if (collectionsRes.error) return collectionsRes;
	if (schemaRes.error) return schemaRes;

	const refsRes = await resolveDocumentRefs(context, {
		collection: collectionRes.data,
		collections: collectionsRes.data,
		brickSchema: schemaRes.data,
		responses: [],
		versionType: "latest",
		refResources: "all",
		refTargets: targets,
		host: getBaseUrl(context),
		reader: data.reader,
	});
	if (refsRes.error) return refsRes;

	return { error: undefined, data: refsRes.data.refs ?? {} };
};

export default resolveContentRefs;
