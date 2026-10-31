const LOAD_TIMEOUT = 15_000;

const scripts = new Map<string, Promise<void>>();

/** Loads an external script once per URL. `ready` waits for scripts that finish setting up later. Failed loads can be retried. */
export const loadScript = (
	src: string,
	ready?: () => Promise<void>,
): Promise<void> => {
	const existing = scripts.get(src);
	if (existing) return existing;

	const promise = new Promise<void>((resolve, reject) => {
		const script = document.createElement("script");
		const fail = () => {
			clearTimeout(timer);
			script.remove();
			reject(new Error(`The script ${src} could not be loaded.`));
		};
		const timer = setTimeout(fail, LOAD_TIMEOUT);

		script.src = src;
		script.async = true;
		script.onerror = fail;
		script.onload = () => {
			Promise.resolve()
				.then(ready)
				.then(() => {
					clearTimeout(timer);
					resolve();
				}, fail);
		};
		document.head.append(script);
	}).catch((error: unknown) => {
		scripts.delete(src);
		throw error;
	});

	scripts.set(src, promise);
	return promise;
};
