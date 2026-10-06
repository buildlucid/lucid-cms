import { type CollectionBuilder, copy } from "@lucidcms/core";
import type { CollectionTableNames, ServiceFn } from "@lucidcms/core/types";
import type {
	CollectionConfig,
	ProjectedFullSlug,
	RouteScope,
} from "../types/types.js";
import formatFullSlug from "../utils/format-fullslug.js";
import resolveCollectionPrefix from "../utils/resolve-collection-prefix.js";
import resolvePagesCollectionLocalization from "../utils/resolve-pages-collection-localization.js";
import getPagesFields, { type PageVersionFields } from "./get-pages-fields.js";
import resolveStoredRoutePrefixes from "./resolve-stored-route-prefixes.js";

export type RequestTargetMember = {
	requestDocumentId: number;
	documentId: number;
	/** The request's captured version, or the environment version it was published as. */
	versionId: number;
};

export type RequestTargetProjection = {
	/** Reads members by their version and everything else from the target. */
	scope: RouteScope;
	members: PageVersionFields[];
	projected: ProjectedFullSlug[];
	/** Members whose route cannot be built in the target, with a translated reason. */
	problems: Array<{ requestDocumentId: number; message: string }>;
	/** Members with no captured page above them in the target. Their descendant passes reach every other member. */
	roots: number[];
};

/**
 * Projects the routes a request's pages will have in one target environment,
 * reading parents from the request where captured and from the environment
 * otherwise. Environment parents are followed up to the nearest captured page,
 * so a completed rename reaches every captured page below it. Pages whose
 * parent is missing there or whose parents loop are reported as problems
 * rather than routes.
 */
const projectRequestTargetRoutes: ServiceFn<
	[
		{
			collection: CollectionConfig;
			collectionInstance: CollectionBuilder;
			tables: CollectionTableNames;
			target: string;
			members: RequestTargetMember[];
		},
	],
	RequestTargetProjection
> = async (context, data) => {
	const scope: RouteScope = {
		type: "request",
		fallback: data.target,
		versions: new Map(
			data.members.map((member) => [member.documentId, member.versionId]),
		),
	};
	const localization = resolvePagesCollectionLocalization({
		localization: context.config.localization,
		collection: data.collection,
		collectionInstance: data.collectionInstance,
	});
	const problems: RequestTargetProjection["problems"] = [];
	const seenProblems = new Set<string>();
	const addProblem = (requestDocumentId: number, message: string) => {
		const key = `${requestDocumentId}:${message}`;
		if (seenProblems.has(key)) return;
		seenProblems.add(key);
		problems.push({ requestDocumentId, message });
	};

	const membersRes = await getPagesFields(context, {
		collectionKey: data.collection.key,
		scope,
		tables: data.tables,
		versionIds: data.members.map((member) => member.versionId),
	});
	if (membersRes.error) return membersRes;
	const memberFields = new Map(
		membersRes.data.map((version) => [version.document_id, version]),
	);
	const parentOf = (version: PageVersionFields) =>
		version.rows.find((row) => row._parentPage !== null)?._parentPage ?? null;

	//* environment ancestors are followed up to the nearest captured page, so a
	//* completed rename reaches pages captured further down even when the pages
	//* between them are not in the request
	const externals = new Map<number, PageVersionFields>();
	const requested = new Set<number>();
	let pending = [
		...new Set(
			membersRes.data.flatMap((version) => {
				const parent = parentOf(version);
				return parent !== null && !memberFields.has(parent) ? [parent] : [];
			}),
		),
	];
	while (pending.length > 0) {
		for (const id of pending) requested.add(id);
		const externalsRes = await getPagesFields(context, {
			collectionKey: data.collection.key,
			scope,
			tables: data.tables,
			documentIds: pending,
		});
		if (externalsRes.error) return externalsRes;

		pending = [];
		for (const version of externalsRes.data) {
			externals.set(version.document_id, version);
			const parent = parentOf(version);
			if (
				parent !== null &&
				!memberFields.has(parent) &&
				!requested.has(parent)
			) {
				pending.push(parent);
			}
		}
	}

	/** Whether a page's ancestry, followed through the environment, reaches a captured page. */
	const reachesMember = (documentId: number | null, visited: number[]) => {
		let current = documentId;
		while (current !== null && !visited.includes(current)) {
			if (memberFields.has(current)) return true;
			visited.push(current);
			const external = externals.get(current);
			current = external ? parentOf(external) : null;
		}
		return false;
	};

	const prefixesRes = await resolveStoredRoutePrefixes(context, {
		collection: data.collection,
		collectionInstance: data.collectionInstance,
		versionType: data.target,
		versionIds: data.members.map((member) => member.versionId),
	});
	if (prefixesRes.error) {
		//* a missing route segment value in the target affects every page read with it
		const message = context.translate(
			prefixesRes.error.message ??
				copy("server:plugin.pages.route.segment.value.missing"),
		);
		for (const member of data.members) {
			addProblem(member.requestDocumentId, message);
		}
		return {
			error: undefined,
			data: {
				scope,
				members: membersRes.data,
				projected: [],
				problems,
				roots: [],
			},
		};
	}

	/**
	 * Builds a page's route in a locale for the completed page being projected,
	 * following captured parents and environment parents above them, and
	 * stopping at loops.
	 */
	const buildRoute = (
		version: PageVersionFields,
		locale: string | null,
		requestDocumentId: number,
		visited: number[],
	): string | null => {
		const row = version.rows.find((row) => row.locale === locale);
		if (!row?._slug) return null;
		const isMember = memberFields.has(version.document_id);

		//* an environment page with no captured page above it keeps its stored route
		if (!isMember && !reachesMember(row._parentPage, [...visited])) {
			return row._fullSlug ?? null;
		}
		if (row._parentPage === null) {
			return formatFullSlug(
				prefixesRes.data.get(version.document_version_id)?.get(locale) ??
					resolveCollectionPrefix({
						collection: data.collection,
						localeCode: locale,
					}),
				row._slug,
			);
		}
		if (visited.includes(row._parentPage)) {
			addProblem(
				requestDocumentId,
				context.translate(copy("server:plugin.pages.parents.circular")),
			);
			return null;
		}

		const parent =
			memberFields.get(row._parentPage) ?? externals.get(row._parentPage);
		if (!parent) {
			addProblem(
				requestDocumentId,
				context.translate(
					copy("server:plugin.pages.request.parent.missing", {
						data: { target: data.target },
					}),
				),
			);
			return null;
		}

		const parentRoute = buildRoute(parent, locale, requestDocumentId, [
			...visited,
			version.document_id,
		]);
		return parentRoute === null ? null : formatFullSlug(parentRoute, row._slug);
	};

	return {
		error: undefined,
		data: {
			scope,
			members: membersRes.data,
			projected: data.members.flatMap((member) => {
				const version = memberFields.get(member.documentId);
				if (!version) return [];
				return {
					documentId: version.document_id,
					versionId: version.document_version_id,
					values: new Map(
						localization.locales.map((locale) => [
							locale,
							buildRoute(version, locale, member.requestDocumentId, []),
						]),
					),
				};
			}),
			problems,
			roots: membersRes.data.flatMap((version) =>
				reachesMember(parentOf(version), []) ? [] : [version.document_id],
			),
		},
	};
};

export default projectRequestTargetRoutes;
