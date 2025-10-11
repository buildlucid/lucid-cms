import clearExpiredLocales from "./clear-expired-locales.js";
import clearExpiredTokens from "./clear-expired-tokens.js";
import updateMediaStorage from "./update-media-storage.js";
import deleteExpiredUnsyncedMedia from "./delete-expired-unsynced-media.js";
import clearExpiredCollections from "./clear-expired-collections.js";
import deleteExpiredDeletedMedia from "./delete-expired-deleted-media.js";
import deleteExpiredDeletedDocuments from "./delete-expired-deleted-documents.js";
import deleteExpiredDeletedUsers from "./delete-expired-deleted-users.js";

export default {
	clearExpiredLocales,
	clearExpiredTokens,
	updateMediaStorage,
	deleteExpiredUnsyncedMedia,
	clearExpiredCollections,
	deleteExpiredDeletedMedia,
	deleteExpiredDeletedUsers,
	deleteExpiredDeletedDocuments,
};
