/** Builds the admin path for a request or one of its documents, eg. for notification links. */
const getRequestPath = (
	requestId: number,
	document?: { collectionKey: string; documentId: number },
) =>
	document
		? `/lucid/requests/${requestId}/content/${encodeURIComponent(document.collectionKey)}/${document.documentId}`
		: `/lucid/requests/${requestId}`;

export default getRequestPath;
