import type { Collection } from "../../types/response.js";
import type CollectionBuilder from "../collection/builders/collection-builder/index.js";
import type { MigrationStatus } from "../collection/get-collection-migration-status.js";
import {
	resolveCollectionPermission,
	resolveCollectionPermissions,
} from "../permission/collection-permissions.js";

const formatMultiple = (props: {
	collections: CollectionBuilder[];
	include?: {
		bricks?: boolean;
		fields?: boolean;
		documentId?: boolean;
	};
	documents?: Array<{
		id: number;
		collection_key: string;
	}>;
}) => {
	return props.collections.map((c) =>
		formatSingle({
			collection: c,
			include: props.include,
			documents: props.documents,
		}),
	);
};

const formatSingle = (props: {
	collection: CollectionBuilder;
	migrationStatus?: MigrationStatus;
	include?: {
		bricks?: boolean;
		fields?: boolean;
		documentId?: boolean;
	};
	documents?: Array<{
		id?: number;
		collection_key: string;
	}>;
}): Collection => {
	const collectionData = props.collection.getData;
	const key = props.collection.key;
	const resolvedPermissions = resolveCollectionPermissions(props.collection);

	return {
		key: key,
		mode: collectionData.mode,
		documentId: props.include?.documentId
			? getDocumentId(key, props.documents)
			: undefined,
		details: {
			name: collectionData.details.name,
			singularName: collectionData.details.singularName,
			summary: collectionData.details.summary,
		},
		config: {
			translations: collectionData.config.translations,
			revisions: collectionData.config.revisions,
			locked: collectionData.config.locked,
			displayInListing: props.collection.displayInListing,
			autoSave: collectionData.config.autoSave,
			review: collectionData.config.review,
			workflow: collectionData.config.workflow,
			environments: collectionData.config.environments.map((environment) => ({
				...environment,
				permissions: {
					publish: resolveCollectionPermission({
						collection: props.collection,
						action: "publish",
						target: environment.key,
					}),
					review: resolveCollectionPermission({
						collection: props.collection,
						action: "review",
						target: environment.key,
					}),
				},
			})),
		},
		permissions: resolvedPermissions,
		migrationStatus: props.migrationStatus ?? null,
		fixedBricks: props.include?.bricks
			? (props.collection.fixedBricks ?? [])
			: [],
		builderBricks: props.include?.bricks
			? (props.collection.builderBricks ?? [])
			: [],
		fields: props.include?.fields ? (props.collection.fieldTree ?? []) : [],
	};
};

const getDocumentId = (
	collectionKey: string,
	documents?: Array<{
		id?: number;
		collection_key: string;
	}>,
) => {
	const document = documents?.find(
		(document) => document.collection_key === collectionKey,
	);

	return document?.id ?? undefined;
};

export default {
	formatMultiple,
	formatSingle,
};
