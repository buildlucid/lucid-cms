import type { DocumentHookRelease } from "@lucidcms/core/types";
import { type RawBuilder, sql } from "kysely";
import type { RouteScope } from "../types/types.js";

/** The scope hooks work in: a release's captured versions when a release owns the write, otherwise the version type. */
export const resolveRouteScope = (data: {
	versionType: Extract<RouteScope, { type: "version" }>["versionType"];
	release?: DocumentHookRelease;
	collectionKey: string;
}): RouteScope => {
	if (!data.release) {
		return { type: "version", versionType: data.versionType };
	}
	return releaseScope({
		release: data.release,
		collectionKey: data.collectionKey,
		fallback: "latest",
	});
};

/**
 * A release's proposals for one collection, with other documents read from the
 * fallback type. Snapshots are frozen copies of an environment, so they are
 * neither read as parents nor rewritten.
 */
export const releaseScope = (data: {
	release: DocumentHookRelease;
	collectionKey: string;
	fallback: Extract<RouteScope, { type: "version" }>["versionType"];
}): RouteScope => ({
	type: "release",
	fallback: data.fallback,
	versions: new Map(
		data.release.documents
			.filter(
				(document) =>
					document.collectionKey === data.collectionKey &&
					document.source === "latest",
			)
			.map((document) => [document.documentId, document.versionId]),
	),
});

/** The version type related documents, eg. route segments, are read from. */
export const scopeRelationVersionType = (scope: RouteScope) =>
	scope.type === "version" ? scope.versionType : scope.fallback;

/** Matches the one version a scope reads for each document. */
export const scopeVersionFilter = (
	versionTable: string,
	scope: RouteScope,
): RawBuilder<boolean> => {
	const type = sql.ref(`${versionTable}.type`);
	if (scope.type === "version") {
		return sql<boolean>`${type} = ${scope.versionType}`;
	}
	if (scope.versions.size === 0) {
		return sql<boolean>`${type} = ${scope.fallback}`;
	}
	return sql<boolean>`(${sql.ref(`${versionTable}.id`)} in (${sql.join([...scope.versions.values()])}) or (${type} = ${scope.fallback} and ${sql.ref(`${versionTable}.document_id`)} not in (${sql.join([...scope.versions.keys()])})))`;
};

/** Matches only the versions a scope may rewrite: a release never touches documents outside it. */
export const scopeMemberFilter = (
	versionTable: string,
	scope: RouteScope,
): RawBuilder<boolean> => {
	if (scope.type === "version") {
		return sql<boolean>`${sql.ref(`${versionTable}.type`)} = ${scope.versionType}`;
	}
	if (scope.versions.size === 0) return sql<boolean>`1 = 0`;
	return sql<boolean>`${sql.ref(`${versionTable}.id`)} in (${sql.join([...scope.versions.values()])})`;
};

/** Bound parameters a scope filter adds to a statement. */
export const scopeParameterCount = (scope: RouteScope) =>
	scope.type === "version" ? 1 : scope.versions.size * 2 + 1;
