import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";

export const EDITOR_MAX_HEIGHT = "24rem";

export const cmTheme = EditorView.theme(
	{
		"&": {
			backgroundColor: "#181818",
			color: "#C9C9C9",
			fontSize: "13px",
			borderRadius: "6px",
			border: "1px solid rgba(255, 255, 255, 0.1)",
			transition: "border-color 200ms",
			maxHeight: EDITOR_MAX_HEIGHT,
		},
		"&.cm-focused": {
			outline: "none",
			borderColor: "#C1FE77",
		},
		".cm-scroller": {
			overflow: "auto",
		},
		".cm-content": {
			caretColor: "#C1FE77",
			fontFamily:
				'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
			padding: "8px 0",
		},
		".cm-gutters": {
			backgroundColor: "#141414",
			color: "#555",
			border: "none",
			borderRadius: "6px 0 0 6px",
		},
		".cm-cursor, .cm-dropCursor": {
			borderLeftColor: "#C1FE77",
		},
		".cm-activeLine": {
			backgroundColor: "rgba(255, 255, 255, 0.03)",
		},
		".cm-activeLineGutter": {
			backgroundColor: "rgba(255, 255, 255, 0.05)",
			color: "#888",
		},
		".cm-selectionBackground, ::selection": {
			backgroundColor: "rgba(193, 254, 119, 0.15) !important",
		},
		".cm-selectionMatch": {
			backgroundColor: "rgba(193, 254, 119, 0.1)",
		},
		".cm-matchingBracket": {
			backgroundColor: "rgba(193, 254, 119, 0.25)",
			color: "#C1FE77 !important",
		},
		".cm-nonmatchingBracket": {
			backgroundColor: "rgba(247, 85, 85, 0.25)",
			color: "#F75555 !important",
		},
		".cm-foldPlaceholder": {
			backgroundColor: "rgba(255, 255, 255, 0.1)",
			border: "none",
			color: "#999",
		},
		".cm-tooltip": {
			backgroundColor: "#171717",
			border: "1px solid rgba(255, 255, 255, 0.1)",
			borderRadius: "6px",
			color: "#C9C9C9",
		},
		".cm-tooltip-autocomplete": {
			"& > ul > li[aria-selected]": {
				backgroundColor: "rgba(193, 254, 119, 0.15)",
			},
		},
		".cm-panels": {
			backgroundColor: "#141414",
			color: "#C9C9C9",
		},
		".cm-panels.cm-panels-top": {
			borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
		},
		".cm-panels.cm-panels-bottom": {
			borderTop: "1px solid rgba(255, 255, 255, 0.1)",
		},
		".cm-searchMatch": {
			backgroundColor: "rgba(193, 254, 119, 0.2)",
		},
		".cm-searchMatch.cm-searchMatch-selected": {
			backgroundColor: "rgba(193, 254, 119, 0.35)",
		},
		".cm-lint-marker-error": {
			content: "none",
		},
		".cm-lintRange-error": {
			backgroundImage: "none",
			textDecoration: "underline wavy #F75555",
		},
		".cm-diagnostic-error": {
			borderLeftColor: "#F75555",
		},
		".cm-placeholder": {
			color: "#555",
			fontStyle: "italic",
		},
		"&.cm-json-invalid": {
			borderColor: "#F75555",
		},
		"&.cm-json-invalid.cm-focused": {
			borderColor: "#F75555",
		},
	},
	{ dark: true },
);

const highlightStyle = HighlightStyle.define([
	// literals
	{ tag: tags.string, color: "#C1FE77" },
	{ tag: [tags.special(tags.string), tags.regexp], color: "#FF9E64" },
	{ tag: tags.number, color: "#7EC8E3" },
	{ tag: [tags.bool, tags.null, tags.atom], color: "#FF9E64" },
	{ tag: tags.escape, color: "#FF9E64" },
	// keywords & operators
	{
		tag: [
			tags.keyword,
			tags.modifier,
			tags.operatorKeyword,
			tags.controlKeyword,
			tags.definitionKeyword,
			tags.moduleKeyword,
			tags.self,
		],
		color: "#B18CFF",
	},
	{ tag: tags.operator, color: "#8A8A8A" },
	// names
	{ tag: tags.propertyName, color: "#C9C9C9" },
	{ tag: tags.definition(tags.propertyName), color: "#7EC8E3" },
	{ tag: tags.variableName, color: "#C9C9C9" },
	{ tag: tags.definition(tags.variableName), color: "#E3E3E3" },
	{
		tag: [tags.function(tags.variableName), tags.function(tags.propertyName)],
		color: "#82B4FF",
	},
	{
		tag: [tags.typeName, tags.className, tags.namespace],
		color: "#FFC777",
	},
	{ tag: [tags.labelName, tags.macroName], color: "#FFC777" },
	// markup (html/xml/markdown)
	{ tag: tags.tagName, color: "#F98A8A" },
	{ tag: tags.attributeName, color: "#FFC777" },
	{ tag: tags.attributeValue, color: "#C1FE77" },
	{ tag: tags.angleBracket, color: "#888" },
	{ tag: tags.heading, color: "#E3E3E3", fontWeight: "bold" },
	{ tag: tags.emphasis, fontStyle: "italic" },
	{ tag: tags.strong, fontWeight: "bold" },
	{ tag: tags.strikethrough, textDecoration: "line-through" },
	{ tag: tags.link, color: "#7EC8E3", textDecoration: "underline" },
	{ tag: tags.url, color: "#7EC8E3" },
	{ tag: tags.monospace, color: "#C1FE77" },
	{ tag: tags.contentSeparator, color: "#666" },
	// comments & meta
	{
		tag: [tags.comment, tags.lineComment, tags.blockComment],
		color: "#6E6E6E",
		fontStyle: "italic",
	},
	{ tag: [tags.meta, tags.documentMeta, tags.annotation], color: "#8A8A8A" },
	{ tag: tags.processingInstruction, color: "#8A8A8A" },
	// structure
	{ tag: tags.punctuation, color: "#666" },
	{ tag: tags.brace, color: "#888" },
	{ tag: tags.squareBracket, color: "#888" },
	{ tag: tags.invalid, color: "#F75555" },
]);

export const cmHighlighting = syntaxHighlighting(highlightStyle);
