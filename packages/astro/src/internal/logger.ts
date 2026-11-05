import type { AstroLoggerDestination, AstroLoggerMessage } from "astro";
import consoleDestination from "astro/logger/console";

/** The options the integration passes through Astro's `logger` config. */
export type LucidLoggerConfig = {
	/** Paths Lucid serves, whose requests it logs itself. */
	paths: string[];
};

const colourCodes = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g");
/** Astro's development request line, such as `[403] POST /api/v1/auth 1ms`, capturing its path. */
const requestLine = /^\[\d{3}\] (?:\(rewrite\) )?(?:[A-Z]+ )?(\/\S*)/;

/** Filters duplicate Lucid request logs and forwards other messages to Astro's console. */
const lucidLoggerDestination = (
	config: LucidLoggerConfig,
): AstroLoggerDestination => {
	const destination = consoleDestination();

	const isLucidRequest = (event: AstroLoggerMessage) => {
		if (event.label !== null || event.level !== "info") return false;

		const path = event.message.replace(colourCodes, "").match(requestLine)?.[1];
		return (
			path !== undefined &&
			config.paths.some(
				(mountPath) => path === mountPath || path.startsWith(`${mountPath}/`),
			)
		);
	};

	return {
		write: (event) => {
			if (isLucidRequest(event)) return;
			destination.write(event);
		},
	};
};

export default lucidLoggerDestination;
