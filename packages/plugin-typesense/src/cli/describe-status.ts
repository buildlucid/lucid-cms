import type { TypesenseStatus } from "../toolkit/get-status/index.js";

/** Sums up an index's status in one line, such as `"articles" (alias "articles") is up to date`. */
const describeStatus = (status: TypesenseStatus) => {
	const parts = [
		status.pending === 0
			? "is up to date"
			: `has ${status.pending} pending ${status.pending === 1 ? "change" : "changes"}`,
	];
	if (status.rebuild?.status === "pending") {
		parts.push(
			`a rebuild is in progress with ${status.rebuild.processed} processed`,
		);
	}
	if (status.worker === "running") parts.push("a worker is indexing it");
	if (status.lastSuccessAt) parts.push(`last indexed ${status.lastSuccessAt}`);

	return `"${status.index}" (alias "${status.alias}") ${parts.join(", ")}`;
};

export default describeStatus;
