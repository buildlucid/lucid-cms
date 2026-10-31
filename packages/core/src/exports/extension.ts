import constants from "../constants/constants.js";

export { default as collections } from "../libs/collection/collections.js";
export { default as buildTableName } from "../libs/collection/helpers/build-table-name.js";
export { default as prefixGeneratedColName } from "../libs/collection/helpers/prefix-generated-column-name.js";
export {
	default as resolveCollectionLocalization,
	isCollectionFieldLocalized,
} from "../libs/collection/helpers/resolve-collection-localization.js";
export { getTableNames as getCollectionTableNames } from "../libs/collection/schema/runtime/runtime-schema-selectors.js";
export { default as DatabaseAdapter } from "../libs/db/adapter-base.js";
export {
	createDatabaseAdapterCreator,
	createDatabaseAdapterFactory,
} from "../libs/db/adapter-factory.js";
export { codecs } from "../libs/db/client/index.js";
export { default as formatDocumentRoute } from "../libs/formatters/document-route.js";
export { default as addContentSecurityPolicySources } from "../libs/http/utils/add-content-security-policy-sources.js";
export {
	formatTranslation,
	hydrateAdminCopyDefaults,
	isTranslatableCopy,
} from "../libs/i18n/index.js";
export { consumeJob } from "../libs/jobs/consume/index.js";
export { drainJobs } from "../libs/jobs/drain.js";
export { DEFAULT_KV_NAMESPACE } from "../libs/kv/constants.js";
export { default as contentCacheTags } from "../libs/kv/content-cache-tags.js";
export { getHttpCacheNamespaceTokens as getCacheTagTokens } from "../libs/kv/http-cache.js";
export {
	getNamespacePrefix as getKVNamespacePrefix,
	resolveKey as resolveKVKey,
} from "../libs/kv/utils.js";
export { toWebReadable } from "../libs/media-storage/normalize-body.js";
export {
	createSignedMediaUrl,
	validateSignedMediaUrl,
} from "../libs/media-storage/signed-url.js";
export { default as pluginDirectory } from "../libs/plugins/plugin-directory.js";
export { default as pluginPublicPath } from "../libs/plugins/plugin-public-path.js";
export { resolveRelatedDocumentVersionType } from "../services/documents/helpers/resolve-relation-version-type.js";
export {
	buildDownloadContentDisposition,
	getFileMetadata,
} from "../utils/media/index.js";

export const logScopes = constants.logScopes;
/** URL paths Lucid serves, such as `/admin` and `/api`, which sites and public files can't use. */
export const reservedPaths = constants.paths;
/** The public folder plugin files are served from, as `pluginPublicPath()` writes them. */
export const pluginPublicDirectory = constants.directories.pluginPublic;
