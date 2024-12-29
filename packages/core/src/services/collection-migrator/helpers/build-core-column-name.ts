import constants from "../../../constants/constants.js";

/**
 * Appends a core column prefix to a given column name.
 * This is required on tables that can contain generated column names, such as the CF columns in the collection document tables
 */
const buildCoreColumnName = (name: string) =>
	`${constants.db.coreColumnPrefix}${name}`;

export default buildCoreColumnName;
