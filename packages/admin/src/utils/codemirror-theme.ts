import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";
import type { ResolvedTheme } from "@/store/themeStore";

export const EDITOR_MAX_HEIGHT = "24rem";

type CodeMirrorPalette = {
	activeLine: string;
	activeLineGutter: string;
	background: string;
	border: string;
	comment: string;
	error: string;
	foreground: string;
	function: string;
	gutter: string;
	gutterMuted: string;
	gutterText: string;
	keyword: string;
	markup: string;
	number: string;
	operator: string;
	primary: string;
	primary10: string;
	primary15: string;
	primary20: string;
	primary25: string;
	primary35: string;
	punctuation: string;
	special: string;
	tooltip: string;
	type: string;
};

const palettes: Record<ResolvedTheme, CodeMirrorPalette> = {
	light: {
		activeLine: "rgba(24, 24, 27, 0.035)",
		activeLineGutter: "rgba(24, 24, 27, 0.06)",
		background: "#FAFAFA",
		border: "rgba(24, 24, 27, 0.12)",
		comment: "#6B7280",
		error: "#D92D20",
		foreground: "#3F3F46",
		function: "#1D4ED8",
		gutter: "#F4F4F5",
		gutterMuted: "#71717A",
		gutterText: "#6B7280",
		keyword: "#7E22CE",
		markup: "#B42318",
		number: "#0369A1",
		operator: "#52525B",
		primary: "oklch(63.964% 0.14408 135.726)",
		primary10: "oklch(63.964% 0.14408 135.726 / 0.1)",
		primary15: "oklch(63.964% 0.14408 135.726 / 0.15)",
		primary20: "oklch(63.964% 0.14408 135.726 / 0.2)",
		primary25: "oklch(63.964% 0.14408 135.726 / 0.25)",
		primary35: "oklch(63.964% 0.14408 135.726 / 0.35)",
		punctuation: "#71717A",
		special: "#9A3412",
		tooltip: "#FFFFFF",
		type: "#A16207",
	},
	dark: {
		activeLine: "rgba(255, 255, 255, 0.03)",
		activeLineGutter: "rgba(255, 255, 255, 0.05)",
		background: "#181818",
		border: "rgba(255, 255, 255, 0.1)",
		comment: "#6E6E6E",
		error: "#F75555",
		foreground: "#C9C9C9",
		function: "#82B4FF",
		gutter: "#141414",
		gutterMuted: "#888888",
		gutterText: "#555555",
		keyword: "#B18CFF",
		markup: "#F98A8A",
		number: "#7EC8E3",
		operator: "#8A8A8A",
		primary: "oklch(88.842% 0.20897 135.866)",
		primary10: "oklch(88.842% 0.20897 135.866 / 0.1)",
		primary15: "oklch(88.842% 0.20897 135.866 / 0.15)",
		primary20: "oklch(88.842% 0.20897 135.866 / 0.2)",
		primary25: "oklch(88.842% 0.20897 135.866 / 0.25)",
		primary35: "oklch(88.842% 0.20897 135.866 / 0.35)",
		punctuation: "#888888",
		special: "#FF9E64",
		tooltip: "#171717",
		type: "#FFC777",
	},
};

const createEditorTheme = (palette: CodeMirrorPalette, theme: ResolvedTheme) =>
	EditorView.theme(
		{
			"&": {
				backgroundColor: palette.background,
				border: `1px solid ${palette.border}`,
				borderRadius: "6px",
				color: palette.foreground,
				fontSize: "13px",
				maxHeight: EDITOR_MAX_HEIGHT,
				transition: "border-color 200ms, background-color 200ms",
			},
			"&.cm-focused": {
				borderColor: palette.primary,
				outline: "none",
			},
			"&.cm-json-invalid": { borderColor: palette.error },
			"&.cm-json-invalid.cm-focused": { borderColor: palette.error },
			".cm-activeLine": { backgroundColor: palette.activeLine },
			".cm-activeLineGutter": {
				backgroundColor: palette.activeLineGutter,
				color: palette.gutterMuted,
			},
			".cm-content": {
				caretColor: palette.primary,
				fontFamily:
					'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
				padding: "8px 0",
			},
			".cm-cursor, .cm-dropCursor": { borderLeftColor: palette.primary },
			".cm-diagnostic-error": { borderLeftColor: palette.error },
			".cm-foldPlaceholder": {
				backgroundColor: palette.border,
				border: "none",
				color: palette.gutterMuted,
			},
			".cm-gutters": {
				backgroundColor: palette.gutter,
				border: "none",
				borderRadius: "6px 0 0 6px",
				color: palette.gutterText,
			},
			".cm-lint-marker-error": { content: "none" },
			".cm-lintRange-error": {
				backgroundImage: "none",
				textDecoration: `underline wavy ${palette.error}`,
			},
			".cm-matchingBracket": {
				backgroundColor: palette.primary25,
				color: `${palette.primary} !important`,
			},
			".cm-nonmatchingBracket": {
				backgroundColor:
					theme === "dark"
						? "rgba(247, 85, 85, 0.25)"
						: "rgba(217, 45, 32, 0.15)",
				color: `${palette.error} !important`,
			},
			".cm-panels": {
				backgroundColor: palette.gutter,
				color: palette.foreground,
			},
			".cm-panels.cm-panels-bottom": {
				borderTop: `1px solid ${palette.border}`,
			},
			".cm-panels.cm-panels-top": {
				borderBottom: `1px solid ${palette.border}`,
			},
			".cm-placeholder": {
				color: palette.gutterText,
				fontStyle: "italic",
			},
			".cm-scroller": { overflow: "auto" },
			".cm-searchMatch": { backgroundColor: palette.primary20 },
			".cm-searchMatch.cm-searchMatch-selected": {
				backgroundColor: palette.primary35,
			},
			".cm-selectionBackground": {
				backgroundColor: `${palette.primary15} !important`,
			},
			".cm-content ::selection": {
				backgroundColor: `${palette.primary15} !important`,
				color: `${palette.foreground} !important`,
			},
			".cm-selectionMatch": { backgroundColor: palette.primary10 },
			".cm-tooltip": {
				backgroundColor: palette.tooltip,
				border: `1px solid ${palette.border}`,
				borderRadius: "6px",
				color: palette.foreground,
			},
			".cm-tooltip-autocomplete": {
				"& > ul > li[aria-selected]": {
					backgroundColor: palette.primary15,
				},
			},
		},
		{ dark: theme === "dark" },
	);

const createHighlighting = (palette: CodeMirrorPalette) =>
	syntaxHighlighting(
		HighlightStyle.define([
			{ tag: tags.string, color: palette.primary },
			{
				tag: [tags.special(tags.string), tags.regexp],
				color: palette.special,
			},
			{ tag: tags.number, color: palette.number },
			{ tag: [tags.bool, tags.null, tags.atom], color: palette.special },
			{ tag: tags.escape, color: palette.special },
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
				color: palette.keyword,
			},
			{ tag: tags.operator, color: palette.operator },
			{ tag: tags.propertyName, color: palette.foreground },
			{ tag: tags.definition(tags.propertyName), color: palette.number },
			{ tag: tags.variableName, color: palette.foreground },
			{ tag: tags.definition(tags.variableName), color: palette.foreground },
			{
				tag: [
					tags.function(tags.variableName),
					tags.function(tags.propertyName),
				],
				color: palette.function,
			},
			{
				tag: [tags.typeName, tags.className, tags.namespace],
				color: palette.type,
			},
			{ tag: [tags.labelName, tags.macroName], color: palette.type },
			{ tag: tags.tagName, color: palette.markup },
			{ tag: tags.attributeName, color: palette.type },
			{ tag: tags.attributeValue, color: palette.primary },
			{ tag: tags.angleBracket, color: palette.punctuation },
			{ tag: tags.heading, color: palette.foreground, fontWeight: "bold" },
			{ tag: tags.emphasis, fontStyle: "italic" },
			{ tag: tags.strong, fontWeight: "bold" },
			{ tag: tags.strikethrough, textDecoration: "line-through" },
			{
				tag: tags.link,
				color: palette.number,
				textDecoration: "underline",
			},
			{ tag: tags.url, color: palette.number },
			{ tag: tags.monospace, color: palette.primary },
			{ tag: tags.contentSeparator, color: palette.punctuation },
			{
				tag: [tags.comment, tags.lineComment, tags.blockComment],
				color: palette.comment,
				fontStyle: "italic",
			},
			{
				tag: [tags.meta, tags.documentMeta, tags.annotation],
				color: palette.operator,
			},
			{ tag: tags.processingInstruction, color: palette.operator },
			{ tag: tags.punctuation, color: palette.punctuation },
			{ tag: tags.brace, color: palette.punctuation },
			{ tag: tags.squareBracket, color: palette.punctuation },
			{ tag: tags.invalid, color: palette.error },
		]),
	);

export const getCodeMirrorTheme = (theme: ResolvedTheme): Extension[] => {
	const palette = palettes[theme];
	return [createEditorTheme(palette, theme), createHighlighting(palette)];
};
