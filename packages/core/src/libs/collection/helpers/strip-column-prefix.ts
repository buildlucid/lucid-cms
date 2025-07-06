import constants from "../../../constants/constants.js";

/**
 * Removes the prefix from a column name.
 */
const stripColumnPrefix = (name: string): string =>
	name.replace(constants.db.generatedColumnPrefix, "");

export default stripColumnPrefix;
