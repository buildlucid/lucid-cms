import type { LucidUser } from "../../../types/hono.js";
import type { ReleaseRecord } from "../types.js";
import canWriteDocument from "./can-write-document.js";

/**
 * Whether someone who can read a release can work on one of its documents,
 * eg. edit its proposal or acknowledge a changed target. It needs write
 * access to the document while the release is open.
 */
const canEditDocument = (data: {
	release: Pick<ReleaseRecord, "type" | "status" | "created_by">;
	collectionKey: string;
	user: LucidUser;
}) => data.release.status === "open" && canWriteDocument(data);

export default canEditDocument;
