import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";
import type { ResolvedTheme } from "@/store/themeStore/themeStore";

export const EDITOR_MAX_HEIGHT = "24rem";

/** Editor UI colours follow the admin theme tokens, so overrides and dark mode apply automatically. */
const ui = {
	activeLine: "color-mix(in oklab, var(--lucid-title) 4%, transparent)",
	activeLineGutter: "color-mix(in oklab, var(--lucid-title) 6%, transparent)",
	background: "var(--lucid-input)",
	border: "var(--lucid-border)",
	danger: "var(--lucid-danger)",
	dangerLow: "var(--lucid-danger-low)",
	foreground: "var(--lucid-subtitle)",
	gutter: "var(--lucid-code-toolbar)",
	muted: "var(--lucid-muted)",
	primary: "var(--lucid-primary)",
	primaryLow: "var(--lucid-primary-low)",
	primaryLowForeground: "var(--lucid-primary-low-foreground)",
	primaryMedium: "var(--lucid-primary-medium)",
	tooltip: "var(--lucid-popover)",
};

/** Syntax colours are a code colour scheme rather than theme tokens, so they stay per mode. */
type SyntaxPalette = {
	comment: string;
	function: string;
	keyword: string;
	markup: string;
	number: string;
	operator: string;
	punctuation: string;
	special: string;
	type: string;
};

const syntaxPalettes: Record<ResolvedTheme, SyntaxPalette> = {
	light: {
		comment: "#6B7280",
		function: "#1D4ED8",
		keyword: "#7E22CE",
		markup: "#B42318",
		number: "#0369A1",
		operator: "#52525B",
		punctuation: "#71717A",
		special: "#9A3412",
		type: "#A16207",
	},
	dark: {
		comment: "#6E6E6E",
		function: "#82B4FF",
		keyword: "#B18CFF",
		markup: "#F98A8A",
		number: "#7EC8E3",
		operator: "#8A8A8A",
		punctuation: "#888888",
		special: "#FF9E64",
		type: "#FFC777",
	},
};

const createEditorTheme = (theme: ResolvedTheme) =>
	EditorView.theme(
		{
			"&": {
				backgroundColor: ui.background,
				border: `1px solid ${ui.border}`,
				borderRadius: "6px",
				color: ui.foreground,
				fontSize: "13px",
				maxHeight: EDITOR_MAX_HEIGHT,
				transition: "border-color 200ms, background-color 200ms",
			},
			"&.cm-focused": {
				borderColor: ui.primary,
				outline: "none",
			},
			"&.cm-json-invalid": { borderColor: ui.danger },
			"&.cm-json-invalid.cm-focused": { borderColor: ui.danger },
			".cm-activeLine": { backgroundColor: ui.activeLine },
			".cm-activeLineGutter": {
				backgroundColor: ui.activeLineGutter,
				color: ui.muted,
			},
			".cm-content": {
				caretColor: ui.primary,
				fontFamily:
					'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
				padding: "8px 0",
			},
			".cm-cursor, .cm-dropCursor": { borderLeftColor: ui.primary },
			".cm-diagnostic-error": { borderLeftColor: ui.danger },
			".cm-foldPlaceholder": {
				backgroundColor: ui.border,
				border: "none",
				color: ui.muted,
			},
			".cm-gutters": {
				backgroundColor: ui.gutter,
				border: "none",
				borderRadius: "6px 0 0 6px",
				color: ui.muted,
			},
			".cm-lint-marker-error": { content: "none" },
			".cm-lintRange-error": {
				backgroundImage: "none",
				textDecoration: `underline wavy ${ui.danger}`,
			},
			".cm-matchingBracket": {
				backgroundColor: ui.primaryLow,
				color: `${ui.primaryLowForeground} !important`,
			},
			".cm-nonmatchingBracket": {
				backgroundColor: ui.dangerLow,
				color: `${ui.danger} !important`,
			},
			".cm-panels": {
				backgroundColor: ui.gutter,
				color: ui.foreground,
			},
			".cm-panels.cm-panels-bottom": {
				borderTop: `1px solid ${ui.border}`,
			},
			".cm-panels.cm-panels-top": {
				borderBottom: `1px solid ${ui.border}`,
			},
			".cm-placeholder": {
				color: ui.muted,
				fontStyle: "italic",
			},
			".cm-scroller": { overflow: "auto" },
			".cm-searchMatch": { backgroundColor: ui.primaryLow },
			".cm-searchMatch.cm-searchMatch-selected": {
				backgroundColor: ui.primaryMedium,
			},
			".cm-selectionBackground": {
				backgroundColor: `${ui.primaryLow} !important`,
			},
			".cm-content ::selection": {
				backgroundColor: `${ui.primaryLow} !important`,
				color: `${ui.foreground} !important`,
			},
			".cm-selectionMatch": { backgroundColor: ui.primaryLow },
			".cm-tooltip": {
				backgroundColor: ui.tooltip,
				border: `1px solid ${ui.border}`,
				borderRadius: "6px",
				color: ui.foreground,
			},
			".cm-tooltip-autocomplete": {
				"& > ul > li[aria-selected]": {
					backgroundColor: ui.primaryLow,
				},
			},
		},
		{ dark: theme === "dark" },
	);

const createHighlighting = (palette: SyntaxPalette) =>
	syntaxHighlighting(
		HighlightStyle.define([
			{ tag: tags.string, color: ui.primary },
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
			{ tag: tags.propertyName, color: ui.foreground },
			{ tag: tags.definition(tags.propertyName), color: palette.number },
			{ tag: tags.variableName, color: ui.foreground },
			{ tag: tags.definition(tags.variableName), color: ui.foreground },
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
			{ tag: tags.attributeValue, color: ui.primary },
			{ tag: tags.angleBracket, color: palette.punctuation },
			{ tag: tags.heading, color: ui.foreground, fontWeight: "bold" },
			{ tag: tags.emphasis, fontStyle: "italic" },
			{ tag: tags.strong, fontWeight: "bold" },
			{ tag: tags.strikethrough, textDecoration: "line-through" },
			{
				tag: tags.link,
				color: palette.number,
				textDecoration: "underline",
			},
			{ tag: tags.url, color: palette.number },
			{ tag: tags.monospace, color: ui.primary },
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
			{ tag: tags.invalid, color: ui.danger },
		]),
	);

export const getCodeMirrorTheme = (theme: ResolvedTheme): Extension[] => {
	return [createEditorTheme(theme), createHighlighting(syntaxPalettes[theme])];
};
