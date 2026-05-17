import constants from "../../../constants/constants.js";
import toSafeTableName from "./to-safe-table-name.js";

/**
 * Builds deterministic Lucid-owned index names from the table and indexed
 * columns, using the reserved prefix so migrations can safely auto-remove them.
 */
const buildIndexName = (props: {
	tableName: string;
	columns: string[];
	tableNameByteLimit: number | null;
}) => {
	const safeName = toSafeTableName(
		`${constants.db.generatedIndexPrefix}${[
			props.tableName,
			...props.columns,
		].join(constants.db.nameSeparator)}`,
		props.tableNameByteLimit,
	);

	return safeName.name;
};

export default buildIndexName;
