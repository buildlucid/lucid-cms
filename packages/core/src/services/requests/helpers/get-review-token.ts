import { createHash } from "node:crypto";
import type { RequestRecord, RequestState } from "../types.js";

/** Fingerprints the request revision, captured content and target versions to detect stale acknowledgements. */
const getReviewToken = (data: {
	request: Pick<RequestRecord, "id" | "revision" | "documents">;
	state: RequestState;
}) =>
	createHash("sha256")
		.update(
			JSON.stringify([
				data.request.id,
				data.request.revision,
				data.request.documents.map((document) => {
					const state = data.state.get(document.id);
					return [
						document.id,
						state?.source?.contentId ?? null,
						document.targets.map((target) => [
							target.target,
							state?.versions.get(target.target)?.id ?? null,
						]),
					];
				}),
			]),
		)
		.digest("hex");

export default getReviewToken;
