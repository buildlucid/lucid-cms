const STYLES = `:root {
	color-scheme: light dark;
	--background: light-dark(#fafaf9, #111113);
	--text: light-dark(#1c1c1e, #ededef);
	--muted: light-dark(#6b6b72, #8e8e96);
	--panel: light-dark(#f1f1ef, #18181b);
	--border: light-dark(#e3e3df, #27272b);
	--accent: light-dark(#c9372c, #ff6b5e);
	--mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
body { margin: 0; background: var(--background); color: var(--text); font: 15px/1.6 system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
main { max-width: 48rem; margin: 0 auto; padding: 4rem 1rem; }
h1 { margin: 0 0 0.5rem; font-size: 1.5rem; font-weight: 600; line-height: 1.3; text-wrap: balance; }
p { margin: 0 0 1rem; color: var(--muted); }
a { color: inherit; text-underline-offset: 3px; }
code, pre { font: 13px/1.6 var(--mono); }
code { color: var(--text); }
pre { margin: 1.5rem 0 0; padding: 1rem 1.25rem; overflow-x: auto; background: var(--panel); border: 1px solid var(--border); border-radius: 8px; color: var(--muted); }
details { margin-top: 1.5rem; }
details pre { margin-top: 0.75rem; white-space: pre-wrap; }
summary { cursor: pointer; color: var(--muted); font-size: 13px; }
footer { margin-top: 2.5rem; color: var(--muted); font-size: 13px; }
.label { margin-bottom: 0.75rem; color: var(--accent); font: 500 12px/1 var(--mono); letter-spacing: 0.06em; text-transform: uppercase; }
.hit { color: var(--text); }
.caret { color: var(--accent); }`;

/** Wraps raw `body` and `head` HTML in an error document matching the system's light or dark theme. */
const createErrorDocument = (props: {
	title: string;
	body: string;
	head?: string;
}) => `<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8">
		<meta name="referrer" content="no-referrer">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<title>${props.title}</title>
		<style>${STYLES}</style>
		${props.head ?? ""}
	</head>
	<body>
		<main>
			${props.body}
		</main>
	</body>
</html>`;

export default createErrorDocument;
