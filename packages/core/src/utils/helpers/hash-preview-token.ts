import { createHash } from "node:crypto";

/** Creates a deterministic digest so raw preview bearer tokens are never stored. */
const hashPreviewToken = (token: string): string =>
	createHash("sha256").update(token).digest("hex");

export default hashPreviewToken;
