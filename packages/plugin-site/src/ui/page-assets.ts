import escapeHtml from "../utils/escape-html.js";

/*
 * The links and script UI components write around them, and moving them into the head of a page rendered in one go.
 * The tags are written and matched here alone, so the two always agree.
 */

/** Marks what UI components add around them, so whole pages can find it again. */
const MARK = "data-client-component";

/** A stylesheet or preload link a UI component writes. */
export const assetLink = (rel: "stylesheet" | "modulepreload", href: string) =>
	`<link rel="${rel}" href="${escapeHtml(href)}" ${MARK}>`;

/** The `<client-component>` element's script, which every hydrated component writes. */
export const assetScript = (src: string) =>
	`<script type="module" src="${escapeHtml(src)}" ${MARK}></script>`;

const MARKED = new RegExp(
	[
		`<link rel="(stylesheet|modulepreload)" href="([^"]*)" ${MARK}>`,
		`<script type="module" src="([^"]*)" ${MARK}></script>`,
	].join("|"),
	"g",
);
const HEAD_END = /<\/head\s*>/i;

/**
 * Moves the links and scripts UI components wrote into the page's `<head>`, once each. A stylesheet in `inline` is
 * written as a `<style>`, saving a request. Only for pages rendered in one go: a streamed page's head may be sent
 * before its components render, so they keep their tags beside them.
 */
export const moveUiAssets = (html: string, inline: Record<string, string>) => {
	const head = HEAD_END.exec(html);
	if (!head) return html;

	const tags = new Set<string>();
	const body = html.replace(
		MARKED,
		(
			_tag,
			rel: string | undefined,
			href: string | undefined,
			script: string | undefined,
		) => {
			if (script !== undefined) {
				tags.add(`<script type="module" src="${script}"></script>`);
			} else {
				const text = rel === "stylesheet" ? inline[href ?? ""] : undefined;
				tags.add(
					text === undefined
						? `<link rel="${rel}" href="${href}">`
						: `<style>${text}</style>`,
				);
			}
			return "";
		},
	);
	if (tags.size === 0) return html;
	const at = HEAD_END.exec(body)?.index ?? head.index;
	return body.slice(0, at) + [...tags].join("") + body.slice(at);
};
