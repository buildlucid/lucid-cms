import { keyPattern } from "../constants.js";

/**
 * Requires a leading letter followed by letters, digits, hyphens or underscores. Rejects inherited
 * object names such as `constructor` to keep answer lookup safe.
 */
const isFieldName = (name: string): boolean =>
	keyPattern.test(name) && !(name in Object.prototype);

export default isFieldName;
