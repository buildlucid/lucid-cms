import type { Extension } from "@codemirror/state";

/**
 * Lazy loaders for CodeMirror language support. Each loader dynamically
 * imports its language package so the main bundle stays light.
 */
const languageExtensionLoaders: Record<string, () => Promise<Extension>> = {
	javascript: () =>
		import("@codemirror/lang-javascript").then((m) => m.javascript()),
	typescript: () =>
		import("@codemirror/lang-javascript").then((m) =>
			m.javascript({ typescript: true }),
		),
	jsx: () =>
		import("@codemirror/lang-javascript").then((m) =>
			m.javascript({ jsx: true }),
		),
	tsx: () =>
		import("@codemirror/lang-javascript").then((m) =>
			m.javascript({ jsx: true, typescript: true }),
		),
	json: () => import("@codemirror/lang-json").then((m) => m.json()),
	html: () => import("@codemirror/lang-html").then((m) => m.html()),
	css: () => import("@codemirror/lang-css").then((m) => m.css()),
	scss: () =>
		import("@codemirror/lang-sass").then((m) => m.sass({ indented: false })),
	markdown: () => import("@codemirror/lang-markdown").then((m) => m.markdown()),
	yaml: () => import("@codemirror/lang-yaml").then((m) => m.yaml()),
	bash: () =>
		Promise.all([
			import("@codemirror/language"),
			import("@codemirror/legacy-modes/mode/shell"),
		]).then(([language, shell]) => language.StreamLanguage.define(shell.shell)),
	sql: () => import("@codemirror/lang-sql").then((m) => m.sql()),
};

/**
 * Resolves the CodeMirror language extension for a code field language.
 * Returns null for plain text and unknown languages.
 */
export const loadCodeLanguageExtension = async (
	language: string,
): Promise<Extension | null> => {
	const loader = languageExtensionLoaders[language];
	if (!loader) return null;
	return loader();
};

const languageLabels: Record<string, string> = {
	text: "Plain text",
	javascript: "JavaScript",
	typescript: "TypeScript",
	jsx: "JSX",
	tsx: "TSX",
	json: "JSON",
	html: "HTML",
	css: "CSS",
	scss: "SCSS",
	markdown: "Markdown",
	yaml: "YAML",
	bash: "Bash",
	sql: "SQL",
};

/**
 * Returns the display label for a code field language, falling back to the
 * raw language value for unknown languages.
 */
export const getCodeLanguageLabel = (language: string): string => {
	return languageLabels[language] ?? language;
};
