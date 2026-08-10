import { isAllowedUri } from "@tiptap/extension-link";
import { escapeHTMLAttribute } from "@tiptap/static-renderer/json/html-string";

const renderAnchor = (props: {
	href: string;
	children: string;
	openInNewTab: boolean;
	rel?: string;
}) => {
	const target = props.openInNewTab ? ' target="_blank"' : "";
	const relValue =
		props.rel || (props.openInNewTab ? "noopener noreferrer" : "");
	const rel = relValue ? ` rel="${escapeHTMLAttribute(relValue)}"` : "";
	return `<a href="${escapeHTMLAttribute(props.href)}"${target}${rel}>${props.children}</a>`;
};

/** Renders hydrated internal links and ordinary external links. */
export const renderLinkMark = (props: {
	attrs: Record<string, unknown>;
	children?: string | string[];
}) => {
	const children = Array.isArray(props.children)
		? props.children.join("")
		: (props.children ?? "");
	const href = typeof props.attrs.href === "string" ? props.attrs.href : "";
	if (!href || !isAllowedUri(href)) return children;

	return renderAnchor({
		href,
		children,
		openInNewTab: props.attrs.target === "_blank",
		rel: typeof props.attrs.rel === "string" ? props.attrs.rel : undefined,
	});
};
