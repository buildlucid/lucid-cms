/** What the maintenance tile says about the indexes. */
export type StatusSummary = {
	rebuilding: boolean;
	failed: boolean;
	pending: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

/** Sums up the status route's response across every index. Throws when it isn't a list of statuses. */
const summariseStatuses = (value: unknown): StatusSummary => {
	const statuses = isRecord(value) ? value.data : undefined;
	if (!Array.isArray(statuses)) {
		throw new Error("The Typesense status response isn't a list of indexes.");
	}

	const summary: StatusSummary = {
		rebuilding: false,
		failed: false,
		pending: 0,
	};
	for (const status of statuses) {
		if (!isRecord(status)) continue;
		if (isRecord(status.rebuild) && status.rebuild.status === "pending") {
			summary.rebuilding = true;
		}
		if (typeof status.lastError === "string") summary.failed = true;
		if (typeof status.pending === "number") summary.pending += status.pending;
	}

	return summary;
};

export default summariseStatuses;
