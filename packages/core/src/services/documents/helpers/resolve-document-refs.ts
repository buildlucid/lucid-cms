import type CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import type { CollectionSchemaTable } from "../../../libs/collection/schema/types.js";
import type {
	DocumentVersionType,
	LucidBrickTableName,
} from "../../../libs/db/tables/index.js";
import type { DocumentRefVersionTypeResolver } from "../../../libs/refs/documents/types.js";
import {
	addRefTarget,
	resolveRefs,
	selectRefs,
	shouldIncludeRefResource,
} from "../../../libs/refs/index.js";
import registeredRefResources from "../../../libs/refs/registry.js";
import type {
	RefResolvers,
	RefResourceSelection,
	RefTarget,
} from "../../../libs/refs/types.js";
import type { BrickQueryResponse } from "../../../libs/repositories/document-bricks.js";
import type { DocumentQueryResponse } from "../../../libs/repositories/documents.js";
import type { Refs } from "../../../types.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import collectRefTargets from "../../documents-bricks/helpers/collect-ref-targets.js";

type ResolveDocumentRefsResult = {
	/** All hydrated refs needed while formatting this response. */
	hydratedRefs: Refs;
	/** The caller-requested subset exposed on the response. */
	refs?: Refs;
};

/**
 * Collects, deduplicates, fetches and formats every reference required by a
 * document response. Each registered ref type is fetched once for the full batch.
 */
const resolveDocumentRefs: ServiceFn<
	[
		{
			collection: CollectionBuilder;
			collections: CollectionBuilder[];
			brickSchema: Array<CollectionSchemaTable<LucidBrickTableName>>;
			responses: Array<BrickQueryResponse | DocumentQueryResponse>;
			versionType: Exclude<DocumentVersionType, "revision">;
			resolveVersionType?: DocumentRefVersionTypeResolver;
			refResources: RefResourceSelection;
			/** Built-in document refs contributed outside custom field storage. */
			refTargets?: Iterable<RefTarget>;
			allowedDocumentCollectionKeys?: string[];
			flattenRelationRefFields?: boolean;
			host: string;
		},
	],
	ResolveDocumentRefsResult
> = async (context, data) => {
	const publicResources =
		data.refResources === "all" ? undefined : (data.refResources ?? []);
	const targetsRes = await collectRefTargets(context, {
		collection: data.collection,
		brickSchema: data.brickSchema,
		responses: data.responses,
		resources: publicResources,
	});
	if (targetsRes.error) return targetsRes;

	for (const target of data.refTargets ?? []) {
		if (!shouldIncludeRefResource(target.resource, publicResources)) continue;
		addRefTarget(targetsRes.data, target);
	}

	const mediaFormat = {
		host: data.host,
		mediaDelivery: context.mediaDelivery,
	};
	const resolvers: RefResolvers = {
		documents: (targets) =>
			registeredRefResources.documents.resolve(context, {
				targets,
				versionType: data.versionType,
				resolveVersionType: data.resolveVersionType,
				allowedCollectionKeys: data.allowedDocumentCollectionKeys,
				format: {
					collection: data.collection,
					collections: data.collections,
					config: context.config,
					host: data.host,
					bricksTableSchema: data.brickSchema,
					flattenDocumentFields: data.flattenRelationRefFields,
				},
			}),
		media: (targets) =>
			registeredRefResources.media.resolve(context, {
				targets,
				format: mediaFormat,
			}),
		users: (targets) =>
			registeredRefResources.users.resolve(context, {
				targets,
				format: mediaFormat,
			}),
	};
	const refsRes = await resolveRefs({
		targets: targetsRes.data,
		resolvers,
	});
	if (refsRes.error) return refsRes;

	return {
		error: undefined,
		data: {
			hydratedRefs: refsRes.data,
			refs: selectRefs(refsRes.data, data.refResources),
		},
	};
};

export default resolveDocumentRefs;
