import {
	escapeHTML,
	escapeHTMLAttribute,
} from "@tiptap/static-renderer/json/html-string";
import type { RichTextElementRendererProps, RichTextJSON } from "../types.js";

export const childrenToHTML = (children?: string | string[]): string =>
	Array.isArray(children) ? children.join("") : (children ?? "");

export const renderWithCallback = <
	Props extends RichTextElementRendererProps,
>(props: {
	renderer?: (rendererProps: Props) => string;
	fallback?: (rendererProps: NoInfer<Props>) => string;
	rendererProps: Props;
}): string => {
	if (props.renderer) return props.renderer(props.rendererProps);
	if (props.fallback) return props.fallback(props.rendererProps);
	return props.rendererProps.defaultHTML;
};

export const renderDefaultNode = (props: {
	element: string;
	node: RichTextJSON;
	children: string;
}): string => {
	switch (props.element) {
		case "root":
			return props.children;
		case "paragraph":
			return `<p>${props.children}</p>`;
		case "h1":
		case "h2":
		case "h3":
		case "h4":
		case "h5":
		case "h6":
			return `<${props.element}>${props.children}</${props.element}>`;
		case "blockquote":
			return `<blockquote>${props.children}</blockquote>`;
		case "bulletList":
			return `<ul>${props.children}</ul>`;
		case "orderedList": {
			const start = props.node.attrs?.start;
			const startAttribute =
				typeof start === "number" && start !== 1 ? ` start="${start}"` : "";
			return `<ol${startAttribute}>${props.children}</ol>`;
		}
		case "listItem":
			return `<li>${props.children}</li>`;
		case "codeBlock": {
			const language = props.node.attrs?.language;
			const languageClass =
				typeof language === "string" && language
					? ` class="language-${escapeHTMLAttribute(language)}"`
					: "";
			return `<pre><code${languageClass}>${props.children}</code></pre>`;
		}
		case "hardBreak":
			return "<br>";
		case "horizontalRule":
			return "<hr>";
		case "text":
			return escapeHTML(props.node.text ?? "");
		default:
			return "";
	}
};

export const renderDefaultMark = (props: {
	element: string;
	children: string;
}): string => {
	switch (props.element) {
		case "bold":
			return `<strong>${props.children}</strong>`;
		case "italic":
			return `<em>${props.children}</em>`;
		case "strike":
			return `<s>${props.children}</s>`;
		case "underline":
			return `<u>${props.children}</u>`;
		case "code":
			return `<code>${props.children}</code>`;
		default:
			return props.children;
	}
};
