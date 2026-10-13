import DOMPurify from "dompurify";
import { Marked } from "marked";

const markdown = new Marked({ gfm: true, breaks: true });
const allowedTags = [
	"p",
	"br",
	"strong",
	"em",
	"del",
	"code",
	"pre",
	"ul",
	"ol",
	"li",
	"blockquote",
	"h1",
	"h2",
	"h3",
	"h4",
	"a",
	"hr",
	"table",
	"thead",
	"tbody",
	"tr",
	"th",
	"td",
];
const blockTags = "p, li, pre, blockquote, h1, h2, h3, h4, tr, br";
const cacheSize = 300;
const cache = new Map<string, string>();

//* Isolate the link hook from other DOMPurify users.
const purify = DOMPurify();

purify.addHook("afterSanitizeAttributes", (node) => {
	if (node.tagName !== "A") return;
	node.setAttribute("target", "_blank");
	node.setAttribute("rel", "noopener noreferrer");
});

/** Renders sanitised agent markdown with links that open in a new tab. */
export const renderAgentMarkdown = (text: string) =>
	purify.sanitize(markdown.parse(text, { async: false }), {
		ALLOWED_TAGS: allowedTags,
		ALLOWED_ATTR: ["href", "title", "start"],
	});

/** Caches rendered markdown for initial message content and previews. */
export const renderAgentMarkdownCached = (text: string) => {
	const cached = cache.get(text);
	//* Refresh access order so eviction removes the least recently used entry.
	cache.delete(text);
	const html = cached ?? renderAgentMarkdown(text);
	cache.set(text, html);
	const oldest = cache.keys().next();
	if (cache.size > cacheSize && !oldest.done) cache.delete(oldest.value);
	return html;
};

/** Markdown as one line of plain text, for previews such as queued messages. */
export const markdownPreview = (text: string) => {
	const body = new DOMParser().parseFromString(
		renderAgentMarkdownCached(text),
		"text/html",
	).body;
	//* Separate block text before collapsing whitespace for the preview.
	for (const block of body.querySelectorAll(blockTags)) block.append(" ");
	return (body.textContent ?? "").replace(/\s+/g, " ").trim();
};
