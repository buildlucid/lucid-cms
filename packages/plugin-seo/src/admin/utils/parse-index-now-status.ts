import type { IndexNowStatus } from "../../services/index-now/get-status.js";

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

/** Reads the status route's response. Throws when it isn't one. */
const parseIndexNowStatus = (value: unknown): IndexNowStatus => {
	const status = isRecord(value) ? value.data : undefined;
	if (
		!isRecord(status) ||
		!("lastSend" in status) ||
		typeof status.pending !== "number"
	) {
		throw new Error("The IndexNow status response is invalid.");
	}

	const { lastSend, pending } = status;
	if (lastSend === null) return { pending, lastSend: null };
	if (
		!isRecord(lastSend) ||
		typeof lastSend.sentAt !== "string" ||
		typeof lastSend.urlCount !== "number"
	) {
		throw new Error("The IndexNow status response's last send is invalid.");
	}
	return {
		pending,
		lastSend: { sentAt: lastSend.sentAt, urlCount: lastSend.urlCount },
	};
};

export default parseIndexNowStatus;
