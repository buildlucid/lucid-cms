/** Names the document version a hold is on: latest, or a request's proposal. */
const holdTarget = (requestId: number | null) =>
	requestId === null ? "latest" : `request:${requestId}`;

export default holdTarget;
