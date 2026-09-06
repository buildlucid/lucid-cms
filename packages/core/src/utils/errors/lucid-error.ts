/** An error raised outside the API request lifecycle. The caller handles logging. */
class LucidError extends Error {
	readonly scope?: string;
	readonly data?: Record<string, unknown>;

	constructor(options: {
		message: string;
		scope?: string;
		data?: Record<string, unknown>;
		cause?: unknown;
	}) {
		super(options.message, { cause: options.cause });
		this.name = "LucidError";
		this.scope = options.scope;
		this.data = options.data;
	}
}

export default LucidError;
