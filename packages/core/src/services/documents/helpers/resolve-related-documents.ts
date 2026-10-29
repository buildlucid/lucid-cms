import type { DocumentVersionType } from "../../../libs/db/tables/index.js";
import type {
	ContentReadRefs,
	ContentRelatedRef,
} from "../../../libs/formatters/documents.js";
import type { Refs } from "../../../types/response.js";
import type {
	ServiceContext,
	ServiceFn,
} from "../../../utils/services/types.js";
import getMultipleWithRefs from "../content/get-multiple-with-refs.js";
import { resolveRelatedDocumentVersionType } from "./resolve-relation-version-type.js";

type RelatedSource = {
	collectionKey: string;
	versionType: DocumentVersionType;
	refs: Refs;
};

/** The same document can be read in more than one version, when its sources map its collection differently. */
const documentKey = (document: ContentRelatedRef) =>
	`${document.collectionKey}:${document.id}:${document.version}`;

/** A source's document refs, with the version each is read in. */
const versionedRefs = (
	context: ServiceContext,
	source: RelatedSource,
): ContentRelatedRef[] =>
	(source.refs.documents ?? []).map((document) => ({
		...document,
		version: resolveRelatedDocumentVersionType({
			collections: context.config.collections,
			sourceCollectionKey: source.collectionKey,
			sourceVersionType: source.versionType,
			targetCollectionKey: document.collectionKey,
		}),
	}));

/** Reads related documents in full through `depth` levels, including relations and repeaters absent from row refs, and merges their media, user and document refs. */
const resolveRelatedDocuments: ServiceFn<
	[
		{
			source: RelatedSource;
			depth: number;
			allowedCollectionKeys?: string[];
		},
	],
	ContentReadRefs
> = async (context, data) => {
	const media = new Map(
		(data.source.refs.media ?? []).map((item) => [item.id, item]),
	);
	const users = new Map(
		(data.source.refs.users ?? []).map((item) => [item.id, item]),
	);
	const emails = new Map(
		(data.source.refs.emails ?? []).map((item) => [item.id, item]),
	);
	const documents = new Map(
		versionedRefs(context, data.source).map((item) => [
			documentKey(item),
			item,
		]),
	);
	const read = new Set<string>();

	let sources = [data.source];
	for (let level = 1; level <= data.depth && sources.length > 0; level++) {
		//* Each related collection is read once per version, with the version its source maps it to.
		const groups = new Map<
			string,
			{
				collectionKey: string;
				versionType: DocumentVersionType;
				ids: number[];
			}
		>();
		for (const source of sources) {
			for (const document of versionedRefs(context, source)) {
				const key = documentKey(document);
				if (read.has(key)) continue;
				read.add(key);

				const groupKey = `${document.collectionKey}:${document.version}`;
				const group = groups.get(groupKey) ?? {
					collectionKey: document.collectionKey,
					versionType: document.version,
					ids: [],
				};
				group.ids.push(document.id);
				groups.set(groupKey, group);
			}
		}

		const results = await Promise.all(
			Array.from(groups.values(), (group) =>
				getMultipleWithRefs(context, {
					collectionKey: group.collectionKey,
					versionType: group.versionType,
					allowedCollectionKeys: data.allowedCollectionKeys,
					query: {
						filter: { id: { value: group.ids, operator: "in" } },
						page: 1,
						perPage: -1,
						include: [
							"refs.media",
							"refs.users",
							"refs.emails",
							"refs.documents",
						],
					},
				}).then((res) => ({ group, res })),
			),
		);

		sources = [];
		for (const { group, res } of results) {
			if (res.error) return res;
			const source: RelatedSource = {
				collectionKey: group.collectionKey,
				versionType: group.versionType,
				refs: res.data.refs ?? {},
			};

			for (const item of source.refs.media ?? []) media.set(item.id, item);
			for (const item of source.refs.users ?? []) users.set(item.id, item);
			for (const item of source.refs.emails ?? []) emails.set(item.id, item);
			//* Their own document refs only fill gaps, as the next level reads them in full.
			for (const item of versionedRefs(context, source)) {
				if (!documents.has(documentKey(item))) {
					documents.set(documentKey(item), item);
				}
			}
			for (const document of res.data.documents) {
				const item: ContentRelatedRef = {
					id: document.id,
					collectionKey: document.collectionKey,
					version: group.versionType,
					route: document.route,
					fields: document.fields,
				};
				documents.set(documentKey(item), item);
			}
			sources.push(source);
		}
	}

	return {
		error: undefined,
		data: {
			...data.source.refs,
			media: Array.from(media.values()),
			users: Array.from(users.values()),
			emails: Array.from(emails.values()),
			documents: Array.from(documents.values()),
		},
	};
};

export default resolveRelatedDocuments;
