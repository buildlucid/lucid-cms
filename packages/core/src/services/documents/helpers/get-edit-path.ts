/** Builds the admin editor path from `packages/admin/src/Router.tsx`, including the version ID for revisions. */
const getEditPath = (
	collectionKey: string,
	version: string,
	id: number,
	versionId?: number,
) =>
	`/admin/collections/${encodeURIComponent(collectionKey)}/${encodeURIComponent(version)}/${id}${versionId === undefined ? "" : `/${versionId}`}`;

export default getEditPath;
