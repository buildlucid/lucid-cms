import type DatabaseAdapter from "../../../libs/db-adapter/adapter-base.js";
import type { ModifyColumnOperation } from "../migration/types.js";

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
	dbAdapter: DatabaseAdapter,
): "drop-and-add" | "alter" => {
	const needsRecreation =
		!dbAdapter.supports("alterColumn") ||
		modifications.changes.unique !== undefined ||
		modifications.changes.foreignKey !== undefined ||
		modifications.changes.type !== undefined;

	return needsRecreation ? "drop-and-add" : "alter";
};

export default determineColumnModType;
