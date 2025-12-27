import constants from "../../../constants/constants.js";
import type { LucidDocumentTableName } from "../../../types.js";
import { collectionTableParts } from "./build-table-name.js";

/**
 * Extracts the collection key from a LucidDocumentTableName table
 */
const extractCollectionKey = (table: LucidDocumentTableName) => {
	return table
		.split(`${constants.db.prefix}${collectionTableParts.document}`)[1]
		?.replaceAll(constants.db.collectionKeysJoin, "");
};

export default extractCollectionKey;
