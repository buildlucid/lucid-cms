import type { AddressInfo } from "node:net";
import { clearScreenDown, cursorTo } from "node:readline";
import type { ResolvedServerUrls } from "vite";
import constants from "../../../constants/constants.js";
import {
	createPrefix,
	formatTimestamp,
	shouldUseConsoleColors,
} from "../../logger/console-transport/formatters.js";
import cliLogger from "../logger.js";

/** Returns the URL a server listens on, preferring the local URL Vite resolved, such as `http://localhost:6543`. */
export const getServerUrl = (
	resolvedUrls: ResolvedServerUrls | null,
	address: AddressInfo | string | null | undefined,
) => {
	const local = resolvedUrls?.local[0];
	if (local) return local.replace(/\/$/, "");
	if (typeof address === "string") return address;
	if (!address) return "unknown";

	const hostname =
		address.address === "::"
			? "localhost"
			: address.family === "IPv6"
				? `[${address.address}]`
				: address.address;
	return `http://${hostname}:${address.port}`;
};

/** Prints the introduction once per CLI session, with the website when `urls.site` is set. */
export const logServerReady = (props: {
	url: string;
	site?: string;
	/** Whether the server serves the OpenAPI documentation, from `http.openAPI.enabled`. */
	apiDocs: boolean;
	heading: string;
	/** Milliseconds the server took to become ready. */
	elapsed?: number;
}) => {
	cliLogger.log(
		cliLogger.createBadge("LUCID CMS"),
		props.heading,
		...(props.elapsed === undefined
			? []
			: [
					"in",
					cliLogger.color.green(cliLogger.formatMilliseconds(props.elapsed)),
				]),
		{ spaceBefore: true, spaceAfter: true },
	);

	logServerUrls(props);

	cliLogger.log(cliLogger.color.gray("Press CTRL-C to stop the server"), {
		spaceBefore: true,
		spaceAfter: true,
	});
};

/** Logs the admin and Lucid documentation URLs, resolving a configured website against the server URL and including OpenAPI when enabled. */
const logServerUrls = (props: {
	url: string;
	site?: string;
	apiDocs: boolean;
}) => {
	const { url, site } = props;
	const links = [
		site && { label: "🌐 Website", href: new URL(site, url).toString() },
		{ label: "🔐 Admin", href: `${url}/admin` },
		props.apiDocs && {
			label: "📚 API Docs",
			href: `${url}${constants.openAPIDocsRoute}`,
		},
		{ label: "📖 Lucid Docs", href: constants.documentation },
	];

	for (const link of links) {
		if (!link) continue;
		cliLogger.log(link.label.padEnd(16), cliLogger.color.blue(link.href), {
			symbol: "line",
		});
	}
};

/** Logs a dev server restart as an event line, in the same format as the runtime's logs. */
export const logRestart = (message: string) => {
	cliLogger.log(
		createPrefix({
			colors: shouldUseConsoleColors(),
			owner: "core",
			timestamp: formatTimestamp(new Date().toISOString(), true),
		}),
		message,
	);
};

/** Clears the visible screen without deleting scrollback or writing escapes to log files. */
export const clearDevScreen = () => {
	if (!process.stdout.isTTY || process.env.CI) return;

	process.stdout.write(
		"\n".repeat(Math.max(0, (process.stdout.rows ?? 0) - 2)),
	);
	cursorTo(process.stdout, 0, 0);
	clearScreenDown(process.stdout);
};
