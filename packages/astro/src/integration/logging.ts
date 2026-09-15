import { stripVTControlCharacters } from "node:util";
import type { AstroIntegrationLogger } from "astro";
import constants from "../constants.js";

/** Suppresses Astro's hook timer only while a Lucid migration prompt is open. */
export const pauseMigrationWaitLog = (
	logger: Pick<AstroIntegrationLogger, "options">,
	hook: "astro:config:setup" | "astro:server:setup",
) => {
	const options = logger.options;
	const destination = options.destination;
	const waitingMessage = `Waiting for integration "${constants.integrationName}", hook "${hook}"...`;

	options.destination = {
		write(entry) {
			if (
				entry.level === "info" &&
				entry.label === "build" &&
				stripVTControlCharacters(entry.message) === waitingMessage
			)
				return;
			destination.write(entry);
		},
		flush: () => destination.flush?.(),
		close: () => destination.close?.(),
	};

	return () => {
		options.destination = destination;
	};
};
