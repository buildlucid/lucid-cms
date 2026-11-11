/**
 * Releases invocation resources when the response body completes, fails or is cancelled. Pass
 * `waitUntil` on Cloudflare so connection cleanup survives the response and does not retain
 * requests.
 */
const withResponseCleanup = async (
	response: Response,
	cleanup: () => void | Promise<void>,
	waitUntil?: (promise: Promise<unknown>) => void,
): Promise<Response> => {
	if (!response.body) {
		await cleanup();
		return response;
	}

	const reader = response.body.getReader();
	let cleaning: Promise<void> | undefined;
	const runCleanup = () => {
		if (!cleaning) {
			cleaning = (async () => cleanup())();
			waitUntil?.(cleaning);
		}
		return cleaning;
	};
	const body = new ReadableStream<Uint8Array>({
		async pull(controller) {
			try {
				const result = await reader.read();
				if (result.done) {
					controller.close();
					await runCleanup();
					return;
				}
				controller.enqueue(result.value);
			} catch (error) {
				controller.error(error);
				await runCleanup();
			}
		},
		async cancel(reason) {
			try {
				await reader.cancel(reason);
			} finally {
				await runCleanup();
			}
		},
	});

	const wrapped = new Response(body, {
		status: response.status,
		statusText: response.statusText,
		headers: response.headers,
	});
	for (const key of Object.getOwnPropertyNames(response)) {
		const descriptor = Object.getOwnPropertyDescriptor(response, key);
		if (descriptor) Object.defineProperty(wrapped, key, descriptor);
	}
	for (const key of ["redirected", "type", "url"] as const) {
		if (Object.hasOwn(wrapped, key)) continue;
		Object.defineProperty(wrapped, key, {
			configurable: true,
			value: response[key],
		});
	}
	return wrapped;
};

export default withResponseCleanup;
