import {
	KilnRenderError,
	KilnSyntaxError,
	type TemplateLocation,
} from "@lucidkiln/core";
import { VITE_CLIENT } from "../constants.js";
import type { SiteData } from "../types.js";
import escapeHtml from "../utils/escape-html.js";
import createErrorDocument from "./create-error-document.js";

type ErrorReport = {
	label: string;
	title: string;
	/** Where the error happened, then each template that included the one before it. */
	locations: string[];
	frame?: string;
	stack?: string;
};

const formatLocation = (location: TemplateLocation) =>
	location.line > 0
		? `${location.template}:${location.line}:${location.column}`
		: location.template;

const describeError = (error: unknown): ErrorReport => {
	if (error instanceof KilnRenderError) {
		return {
			label: "Render error",
			title: error.detail,
			locations: [
				formatLocation(error),
				...error.templateStack.slice(0, -1).toReversed().map(formatLocation),
			],
			frame: error.frame,
			stack: error.cause instanceof Error ? error.cause.stack : undefined,
		};
	}
	if (error instanceof KilnSyntaxError) {
		const [first] = error.diagnostics;
		// Kiln's message is a summary line, then the first problem's code frame and a count of the rest.
		const [, ...frame] = error.message.split("\n\n");
		return {
			label: "Syntax error",
			title: first?.message ?? error.message,
			locations: first
				? [formatLocation({ template: first.template, ...first.start })]
				: [],
			frame: frame.join("\n\n"),
		};
	}
	if (error instanceof Error) {
		return {
			label: "Error",
			title: error.message,
			locations: [],
			stack: error.stack,
		};
	}
	return { label: "Error", title: String(error), locations: [] };
};

/** Brightens the frame's marked line and its carets. */
const highlightFrame = (frame: string) =>
	frame
		.split("\n")
		.map((line) => {
			const html = escapeHtml(line);
			if (line.startsWith(">")) return `<span class="hit">${html}</span>`;
			if (/^\s*\|\s*\^/.test(line)) return `<span class="caret">${html}</span>`;
			return html;
		})
		.join("\n");

/** Displays source code and stack traces for development use only, with automatic reloads when Vite's dev server runs. */
const createDevErrorPage = (props: {
	error: unknown;
	data: SiteData | null;
}) => {
	const report = describeError(props.error);
	const hmr = props.data?.kind === "dev";
	const locations = report.locations
		.map((location) => `<code>${escapeHtml(location)}</code>`)
		.join(" via ");

	return createErrorDocument({
		title: report.label,
		head: hmr ? `<script type="module" src="${VITE_CLIENT}"></script>` : "",
		body: [
			`<p class="label">500 · ${report.label}</p>`,
			`<h1>${escapeHtml(report.title)}</h1>`,
			locations ? `<p>${locations}</p>` : "",
			report.frame ? `<pre>${highlightFrame(report.frame)}</pre>` : "",
			report.stack
				? `<details${report.frame ? "" : " open"}><summary>Stack trace</summary><pre>${escapeHtml(report.stack)}</pre></details>`
				: "",
			hmr ? "<footer>This page reloads when you save a change.</footer>" : "",
		]
			.filter((section) => section !== "")
			.join("\n"),
	});
};

export default createDevErrorPage;
