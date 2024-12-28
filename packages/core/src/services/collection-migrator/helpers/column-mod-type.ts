import type { ModifyColumnOperation } from "../migration/types.js";
import type { DatabaseConfig } from "../../../types.js";

/**
 * Determines if the column needs to be dropeed and re-created or altered. Only alters if:
 * - the DB adapter supports the ALTER COLUMN op
 * - the unique contraint doesnt need modifying
 * - the foreign key contraint doesnt need modifying
 * - the data type doesnt need modifying
 *
 * In the case it cannot be altered, the column will be dropped and then re-created. In this case data will be lost.
 */
const determineColumnModType = (
	modifications: ModifyColumnOperation,
	dbConfig: DatabaseConfig,
): "drop-and-add" | "alter" => {
	const needsRecreation =
		!dbConfig.support.alterColumn ||
		modifications.changes.unique !== undefined ||
		modifications.changes.foreignKey !== undefined ||
		modifications.changes.type !== undefined;

	return needsRecreation ? "drop-and-add" : "alter";
};

export default determineColumnModType;
