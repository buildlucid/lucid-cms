import constants from "../../../constants/constants.js";

/**
 * Adds a prefix to generated columns names. Primarily used for custom field columns in generated tables.
 */
const prefixGeneratedColName = (name: string): `_${string}` =>
	`${constants.db.generatedColumnPrefix}${name}`;

export default prefixGeneratedColName;
