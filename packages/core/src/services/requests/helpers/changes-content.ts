import type { RequestType } from "../../../libs/db/tables/requests.js";

/** Whether a request type's proposals are edited, as create and update requests change content while publish requests only move it. */
const changesContent = (type: RequestType): type is "create" | "update" =>
	type === "create" || type === "update";

export default changesContent;
