import type { Refs } from "../../../exports/types.js";
import type CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import getContentAccess from "../../../libs/collection/field-access/get-content-access.js";
import type { FieldAccessActor } from "../../../libs/collection/field-access/types.js";
import type { CollectionSchemaTable } from "../../../libs/collection/schema/types.js";
import type {
	DocumentVersionType,
	LucidBrickTableName,
} from "../../../libs/db/tables/index.js";
import { Permissions } from "../../../libs/permission/definitions.js";
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
import type { ServiceFn } from "../../../utils/services/types.js";
import collectRefTargets from "../../documents-bricks/helpers/collect-ref-targets.js";
import filterReadableRefs from "./filter-readable-refs.js";

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
			/** Content API mode flattens relation fields, omits user emails and email recipients, and limits media to the library; admin readers need the matching `users:read` or `email:read` permission for those details. */
			content?: boolean;
			host: string;
			/** Excludes refs linked only by hidden content and related documents' hidden fields; omitted for trusted and external reads. */
			reader?: FieldAccessActor;
		},
	],
	ResolveDocumentRefsResult
> = async (context, data) => {
	const publicResources =
		data.refResources === "all" ? undefined : (data.refResources ?? []);
	const refTargets = Array.from(data.refTargets ?? []);
	const targetsRes = await collectRefTargets(context, {
		collection: data.collection,
		brickSchema: data.brickSchema,
		responses: data.responses,
		resources: publicResources,
	});
	if (targetsRes.error) return targetsRes;

	for (const target of refTargets) {
		if (!shouldIncludeRefResource(target.resource, publicResources)) continue;
		addRefTarget(targetsRes.data, target);
	}

	//* readers see user emails and email recipients only with the matching read permission; trusted callers pass no reader
	const readerCan = (permission: string) =>
		data.reader === undefined ||
		data.reader.superAdmin ||
		data.reader.permissions?.includes(permission) === true;

	const mediaFormat = {
		host: data.host,
		mediaDelivery: context.mediaDelivery,
		defaultLocale: context.config.localization.defaultLocale,
		locales: context.config.localization.locales,
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
					flattenDocumentFields: data.content,
					reader: data.reader,
				},
			}),
		media: (targets) =>
			registeredRefResources.media.resolve(context, {
				targets,
				actor:
					data.content === true ? { type: "content" } : { type: "internal" },
				format: mediaFormat,
			}),
		users: (targets) =>
			registeredRefResources.users.resolve(context, {
				targets,
				format: {
					...mediaFormat,
					email: data.content !== true && readerCan(Permissions.UsersRead),
				},
			}),
		emails: (targets) =>
			registeredRefResources.emails.resolve(context, {
				targets,
				format: {
					delivery: data.content !== true && readerCan(Permissions.EmailRead),
				},
			}),
		agents: (targets) =>
			registeredRefResources.agents.resolve(context, { targets }),
	};
	const refsRes = await resolveRefs({
		targets: targetsRes.data,
		resolvers,
	});
	if (refsRes.error) return refsRes;

	const access =
		data.reader === undefined
			? undefined
			: getContentAccess(data.collection, data.reader);

	return {
		error: undefined,
		data: {
			hydratedRefs: refsRes.data,
			refs: selectRefs(
				access?.restricted
					? filterReadableRefs({
							access,
							collection: data.collection,
							brickSchema: data.brickSchema,
							responses: data.responses,
							config: context.config,
							host: data.host,
							refTargets,
							refs: refsRes.data,
						})
					: refsRes.data,
				data.refResources,
			),
		},
	};
};

export default resolveDocumentRefs;
