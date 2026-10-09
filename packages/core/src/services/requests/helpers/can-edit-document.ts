import type { LucidActor } from "../../../types/hono.js";
import type { RequestRecord } from "../types.js";
import canWriteDocument from "./can-write-document.js";

/**
 * Whether someone who can read a request can work on one of its documents,
 * eg. edit its proposal or acknowledge a changed target. It needs write
 * access to the document while the request is open.
 */
const canEditDocument = (data: {
	request: Pick<RequestRecord, "type" | "status" | "created_by">;
	collectionKey: string;
	user: LucidActor;
}) => data.request.status === "open" && canWriteDocument(data);

export default canEditDocument;
