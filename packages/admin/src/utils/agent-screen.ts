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

/** Checks whether two screens identify the same place in the same tab, allowing labels and filters to change. */
export const isSameScreen = (a: AgentScreen, b: AgentScreen) => {
	if (a.tabId !== b.tabId) return false;
	switch (a.type) {
		case "document":
			return showsDocument(b, a);
		case "request":
			return b.type === "request" && a.requestId === b.requestId;
		case "documents":
			return b.type === "documents" && a.collectionKey === b.collectionKey;
		case "media":
			return b.type === "media" && a.folderId === b.folderId;
		case "history":
			return (
				b.type === "history" &&
				a.collectionKey === b.collectionKey &&
				a.documentId === b.documentId
			);
		case "requests":
		case "review":
			return a.type === b.type;
	}
};

/** Whether a screen is the document builder for a document version, eg. the one a builder change was made in. */
export const showsDocument = (
	screen: AgentScreen,
	document: Pick<
		Extract<AgentScreen, { type: "document" }>,
		"collectionKey" | "documentId" | "requestId"
	>,
) =>
	screen.type === "document" &&
	screen.collectionKey === document.collectionKey &&
	screen.documentId === document.documentId &&
	screen.requestId === document.requestId;
