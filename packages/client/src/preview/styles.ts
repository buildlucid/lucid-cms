export const previewFieldHintStyles = `
@keyframes lucid-preview-field-hint-glimmer {
	0%, 100% { outline-color: rgba(193, 254, 119, .85); }
	40% { outline-color: rgba(56, 189, 248, .85); }
	70% { outline-color: rgba(167, 139, 250, .85); }
}

[data-lucid-preview-target-hint] {
	border-radius: 6px;
	outline: 2px solid rgba(193, 254, 119, .85);
	outline-offset: 6px;
	animation: lucid-preview-field-hint-glimmer 2s ease-in-out infinite;
	cursor: crosshair;
}

@media (prefers-reduced-motion: reduce) {
	[data-lucid-preview-target-hint] {
		animation: none;
		outline-color: rgba(193, 254, 119, .9);
	}
}

@media (forced-colors: active) {
	[data-lucid-preview-target-hint] {
		outline-color: Highlight;
	}
}
`;

export const previewNoticeStyles = `
:host {
	all: initial;
	position: fixed;
	right: max(.75rem, env(safe-area-inset-right, 0px));
	bottom: max(.75rem, env(safe-area-inset-bottom, 0px));
	z-index: 2147483647;
	display: block;
	max-width: calc(100vw - max(1.5rem, env(safe-area-inset-left, 0px) + env(safe-area-inset-right, 0px)));
	contain: layout style;
	pointer-events: none;
	color-scheme: dark;
	font: 500 11px/1.4 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
	-webkit-font-smoothing: antialiased;
}

:host([hidden]), [hidden] { display: none !important; }

.notice {
	box-sizing: border-box;
	width: max-content;
	max-width: min(330px, calc(100vw - 1rem));
	padding: 8px 10px;
	border: 1px solid rgba(255,209,102,.25);
	border-radius: 9px;
	background: rgba(15,15,15,.97);
	box-shadow: 0 8px 28px rgba(0,0,0,.36);
	color: rgba(255,255,255,.86);
	text-align: left;
	animation: enter 160ms ease-out both;
}

@keyframes enter {
	from { opacity: 0; transform: translateY(3px); }
	to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 480px) {
	:host {
		right: max(.5rem, env(safe-area-inset-right, 0px));
		bottom: max(.5rem, env(safe-area-inset-bottom, 0px));
	}
}

@media (prefers-reduced-motion: reduce) {
	.notice { animation: none; }
}

@media (forced-colors: active) {
	.notice { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
}
`;
