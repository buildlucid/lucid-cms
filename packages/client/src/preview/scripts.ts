type ScriptLocation = { path: string; key: symbol };

/** Whether a value on `window` is a script this client knows how to start. */
const isScript = <TScript extends { version: 1 }>(
	value: unknown,
): value is TScript =>
	typeof value === "object" &&
	value !== null &&
	"version" in value &&
	value.version === 1 &&
	"setup" in value &&
	typeof value.setup === "function";

const readScript = <TScript extends { version: 1 }>(
	targetWindow: Window,
	location: ScriptLocation,
): TScript | null => {
	const value: unknown = Reflect.get(targetWindow, location.key);
	return isScript<TScript>(value) ? value : null;
};

/** Loads one of the scripts the CMS serves for sites, resolving with it, or null when it can't load. */
export const loadScript = <TScript extends { version: 1 }>(
	targetWindow: Window,
	host: string,
	location: ScriptLocation,
): Promise<TScript | null> => {
	const existing = readScript<TScript>(targetWindow, location);
	if (existing) return Promise.resolve(existing);

	const { document } = targetWindow;
	const src = new URL(location.path, host).toString();
	return new Promise((resolve) => {
		const script = document.createElement("script");
		script.src = src;
		script.async = true;
		script.addEventListener(
			"load",
			() => resolve(readScript<TScript>(targetWindow, location)),
			{ once: true },
		);
		script.addEventListener(
			"error",
			() => {
				console.warn(
					`Lucid couldn't load ${src}. Check the preview host, and that the page's Content-Security-Policy allows scripts from it.`,
				);
				resolve(null);
			},
			{ once: true },
		);
		(document.head ?? document.documentElement).append(script);
	});
};
