/** Publication diagnostics retained until the job's transaction has rolled back. */
export default class ReleaseExecutionError extends Error {
	constructor(
		readonly releaseDocumentId: number | null,
		readonly target: string | null,
	) {
		super("Release publication failed");
	}
}
