import { randomBytes } from "node:crypto";

/**
 * Generate a share token
 */
const generateShareToken = () => {
	return randomBytes(9).toString("base64url").slice(0, 12);
};

export default generateShareToken;
