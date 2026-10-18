import { KilnRenderError, KilnSyntaxError } from "@lucidkiln/core";
import escapeHtml from "../utils/escape-html.js";

const describeError = (error: unknown): string[] => {
	if (error instanceof KilnRenderError) {
		return [
			error.message,
			error.cause instanceof Error ? (error.cause.stack ?? "") : "",
		];
	}
	if (error instanceof KilnSyntaxError) {
		return [error.message];
	}
	return [
		error instanceof Error ? (error.stack ?? error.message) : String(error),
	];
};

/** Includes source code and stack traces; use only in development. */
const createDevErrorPage = (error: unknown) => {
	const sections = describeError(error)
		.filter((section) => section !== "")
		.map((section) => `<pre>${escapeHtml(section)}</pre>`)
		.join("\n");

	return `<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8">
		<title>Render error</title>
		<style>body{font:14px/1.5 system-ui,sans-serif;margin:2rem;color:#1c1c1c}pre{background:#f4f4f2;padding:1rem;overflow:auto;white-space:pre-wrap}</style>
	</head>
	<body>
		<h1>The page failed to render</h1>
		${sections}
	</body>
</html>`;
};

export default createDevErrorPage;
