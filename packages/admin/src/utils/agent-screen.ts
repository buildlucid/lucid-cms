import type { AgentScreen } from "@types";

//* matches the server's limit, so a long document label never stops a message sending
const labelLength = 200;

/** Shortens a label for a screen, eg. a document's, to the length the server takes. */
export const screenLabel = (label: string) => {
	const trimmed = label.trim();
	return trimmed.length > labelLength
		? `${trimmed.slice(0, labelLength - 1)}…`
		: trimmed;
};

/** Whether two screens are the same one in the same tab, eg. the one a call was made for and the one open now. */
export const isSameScreen = (a: AgentScreen, b: AgentScreen) => {
	if (a.tabId !== b.tabId) return false;
	if (a.type === "document" && b.type === "document") {
		return (
			a.collectionKey === b.collectionKey &&
			a.documentId === b.documentId &&
			a.requestId === b.requestId
		);
	}
	return a.type === "request" && b.type === "request"
		? a.requestId === b.requestId
		: false;
};
