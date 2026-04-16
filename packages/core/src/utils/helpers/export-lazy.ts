// biome-ignore lint/suspicious/noExplicitAny: explanation
type AsyncFunction = (...args: any[]) => Promise<any>;
type DefaultFunctionModule<T extends AsyncFunction> = {
	default: T;
};

const moduleCache = new WeakMap<
	() => Promise<DefaultFunctionModule<AsyncFunction>>,
	Promise<DefaultFunctionModule<AsyncFunction>>
>();

/**
 * Keeps public lazy exports readable while ensuring repeated calls reuse the
 * same module import promise instead of opening fresh dynamic import edges.
 */
const exportLazy = <T extends AsyncFunction>(
	loadModule: () => Promise<DefaultFunctionModule<T>>,
): T => {
	return (async (...args: Parameters<T>) => {
		let modulePromise = moduleCache.get(
			loadModule as () => Promise<DefaultFunctionModule<AsyncFunction>>,
		);

		if (!modulePromise) {
			modulePromise = loadModule();
			moduleCache.set(
				loadModule as () => Promise<DefaultFunctionModule<AsyncFunction>>,
				modulePromise,
			);
		}

		const module = await modulePromise;
		return module.default(...args);
	}) as T;
};

export default exportLazy;
