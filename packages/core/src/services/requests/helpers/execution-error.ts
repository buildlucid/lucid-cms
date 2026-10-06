/** Publication diagnostics retained until the job's transaction has rolled back. */
export default class RequestExecutionError extends Error {
	constructor(
		readonly requestDocumentId: number | null,
		readonly target: string | null,
	) {
		super("Request publication failed");
	}
}
