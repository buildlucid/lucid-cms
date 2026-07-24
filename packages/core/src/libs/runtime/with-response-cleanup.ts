/**
 * Keeps invocation-owned resources alive until a streamed response finishes,
 * then releases them when the body completes, fails or is cancelled.
 */
const withResponseCleanup = async (
	response: Response,
	cleanup: () => void | Promise<void>,
): Promise<Response> => {
	if (!response.body) {
		await cleanup();
		return response;
	}

	const reader = response.body.getReader();
	let cleaned = false;
	const runCleanup = async () => {
		if (cleaned) return;
		cleaned = true;
		await cleanup();
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
