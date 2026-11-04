/** The page's side of edit mode: outlines that read on light and dark pages, with Lucid's green only marking what's selected and where things will go, and red marking errors. The builder draws the controls. */
export const previewOverlayStyles = /* css */ `
:host {
	all: initial;
	position: fixed;
	inset: 0;
	z-index: 2147483646;
	display: block;
	contain: strict;
	pointer-events: none;
	--accent: rgb(151, 248, 95);
	--soft: rgba(120, 120, 128, 0.13);
	--soft-line: rgba(120, 120, 128, 0.34);
	--strong-line: rgba(120, 120, 128, 0.85);
	--danger: rgb(232, 72, 72);
	--danger-soft: rgba(232, 72, 72, 0.1);
	--ease: cubic-bezier(0.2, 0.8, 0.2, 1);
}

*, *::before, *::after { box-sizing: border-box; }
[hidden] { display: none !important; }

.floating { position: absolute; top: 0; left: 0; will-change: translate; }

/* Outlines: hover and selection share a place and shape, 4px outside what they outline */
.fill, .hint {
	border-radius: 7px;
	background: var(--soft);
	box-shadow: inset 0 0 0 1px var(--soft-line);
	animation: fade-in 100ms;
}
.fill--container {
	background: transparent;
	box-shadow: none;
	outline: 1px dashed rgba(120, 120, 128, 0.6);
	outline-offset: -1px;
}
.fill--invalid {
	background: var(--danger-soft);
	box-shadow: inset 0 0 0 1px rgba(232, 72, 72, 0.6);
}
.fill--container.fill--invalid {
	background: transparent;
	box-shadow: none;
	outline-color: var(--danger);
}
/* the hover's look with a firmer line and a dot; bricks are only outlined, as a fill would cover them */
.selected {
	--ring: var(--strong-line);
	border-radius: 7px;
	box-shadow: inset 0 0 0 1.5px var(--ring);
}
.selected--filled { background: var(--soft); }
.selected--invalid { --ring: var(--danger); }
.selected--filled.selected--invalid { background: var(--danger-soft); }
.selected::after {
	content: "";
	position: absolute;
	top: -3px;
	right: -3px;
	width: 7px;
	height: 7px;
	border-radius: 50%;
	background: var(--accent);
	box-shadow: 0 0 0 1.5px rgba(18, 18, 20, 0.55);
}
.selected--invalid::after { background: var(--danger); }
/* typing into the field: unfilled so its text reads clearly, ringed in Lucid's green with a dark edge that shows on light pages */
.selected--typing,
.selected--typing.selected--filled {
	--ring: var(--accent);
	background: transparent;
	box-shadow: inset 0 0 0 1.5px var(--ring), 0 0 0 1px rgba(18, 18, 20, 0.35);
}
.selected--typing.selected--invalid {
	--ring: var(--danger);
	box-shadow: inset 0 0 0 1.5px var(--ring);
}
.selected--pulse { animation: pulse 900ms var(--ease); }
@keyframes pulse {
	from { box-shadow: inset 0 0 0 1.5px var(--ring), 0 0 0 0 color-mix(in srgb, var(--ring) 45%, transparent); }
	to { box-shadow: inset 0 0 0 1.5px var(--ring), 0 0 0 10px transparent; }
}

/* Dragging: where the dragged brick or item would land, which moves there */
.landing {
	border-radius: 7px;
	background: rgba(151, 248, 95, 0.12);
	outline: 2px dashed var(--accent);
	outline-offset: -1px;
	box-shadow: 0 0 0 1px rgba(18, 18, 20, 0.4), inset 0 0 0 2px rgba(18, 18, 20, 0.25);
	animation: fade-in 140ms;
}

@keyframes fade-in { from { opacity: 0; } }

@media (prefers-reduced-motion: reduce) {
	*, *::before, *::after { animation-duration: 1ms !important; }
}

@media (forced-colors: active) {
	.fill, .hint, .selected { box-shadow: none; outline: 2px solid Highlight; }
	.selected--typing { outline-style: dashed; }
	.landing { box-shadow: none; outline-color: Highlight; }
}
`;
