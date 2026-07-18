import type { RichTextJSON } from "../types.js";

const renderInlineContent = (content?: RichTextJSON[]): string =>
	(content ?? []).map((node) => renderNode(node)).join("");

const indentLines = (value: string, indentation: string): string =>
	value
		.split("\n")
		.map((line, index) => (index === 0 ? line : `${indentation}${line}`))
		.join("\n");

const renderListItem = (
	item: RichTextJSON,
	marker: string,
	depth: number,
): string => {
	const indentation = "  ".repeat(depth);
	const continuationIndentation = `${indentation}  `;
	const content = item.content ?? [];
	const body = content
		.filter((node) => node.type !== "bulletList" && node.type !== "orderedList")
		.map((node) => renderNode(node, depth))
		.filter(Boolean)
		.join("\n\n");
	const nestedLists = content
		.filter((node) => node.type === "bulletList" || node.type === "orderedList")
		.map((node) => renderNode(node, depth + 1))
		.filter(Boolean);
	const renderedBody = indentLines(body, continuationIndentation);
	const line = `${indentation}${marker}${renderedBody ? ` ${renderedBody}` : ""}`;

	return [line, ...nestedLists].join("\n");
};

const renderList = (
	node: RichTextJSON,
	ordered: boolean,
	depth: number,
): string => {
	const start =
		ordered && typeof node.attrs?.start === "number" ? node.attrs.start : 1;

	return (node.content ?? [])
		.map((item, index) =>
			renderListItem(item, ordered ? `${start + index}.` : "•", depth),
		)
		.join("\n");
};

const renderBlockContent = (content?: RichTextJSON[], depth = 0): string =>
	(content ?? [])
		.map((node) => renderNode(node, depth))
		.filter(Boolean)
		.join("\n\n");

const renderNode = (node: RichTextJSON, depth = 0): string => {
	switch (node.type) {
		case "doc":
			return renderBlockContent(node.content, depth);
		case "text":
			return node.text ?? "";
		case "hardBreak":
			return "\n";
		case "bulletList":
			return renderList(node, false, depth);
		case "orderedList":
			return renderList(node, true, depth);
		case "blockquote":
			return renderBlockContent(node.content, depth)
				.split("\n")
				.map((line) => `> ${line}`)
				.join("\n");
		case "horizontalRule":
			return "---";
		case "paragraph":
		case "heading":
		case "codeBlock":
			return renderInlineContent(node.content);
		default:
			return renderInlineContent(node.content);
	}
};

export const generatePlainText = (json: RichTextJSON): string =>
	renderNode(json)
		.split("\n")
		.map((line) => line.trimEnd())
		.join("\n")
		.replace(/\n{3,}/g, "\n\n");
