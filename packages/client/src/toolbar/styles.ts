export const toolbarStyles = `
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
	font: 500 12px/1.2 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
	-webkit-font-smoothing: antialiased;
}

:host([hidden]), [hidden] { display: none !important; }

.wrap {
	position: relative;
	display: flex;
	justify-content: flex-end;
	animation: enter 280ms cubic-bezier(.16, 1, .3, 1) both;
}

.pill {
	pointer-events: auto;
	display: inline-flex;
	align-items: center;
	gap: 3px;
	min-height: 34px;
	max-width: 100%;
	padding: 3px 6px;
	border: 1px solid rgba(255,255,255,.1);
	border-radius: 999px;
	background: rgba(12,12,12,.94);
	box-shadow: 0 1px 2px rgba(0,0,0,.4), 0 8px 28px rgba(0,0,0,.34);
	backdrop-filter: blur(18px) saturate(1.2);
	-webkit-backdrop-filter: blur(18px) saturate(1.2);
	color: rgba(255,255,255,.9);
}

.action {
	box-sizing: border-box;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;
	margin: 0;
	padding: 0;
	border: 0;
	border-radius: 999px;
	background: transparent;
	color: rgba(255,255,255,.62);
	text-decoration: none;
	cursor: pointer;
	transition: color 140ms ease, background-color 140ms ease;
}

.action:hover {
	background: rgba(255,255,255,.09);
	color: #fff;
}

.action:focus-visible {
	outline: 2px solid #c1fe77;
	outline-offset: 1px;
}

.action.admin {
	width: auto;
	gap: 5px;
	padding: 0 8px 0 7px;
	color: rgba(255,255,255,.86);
}

.icon {
	display: block;
	width: 13px;
	height: 13px;
}

.lucid-icon {
	display: block;
	width: 15px;
	height: 15px;
}

.brand-label {
	font-size: 11px;
	font-weight: 600;
	letter-spacing: -.01em;
	white-space: nowrap;
}

.separator {
	width: 1px;
	height: 15px;
	background: rgba(255,255,255,.12);
}

.status {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	min-width: 0;
	margin: 0 1px 0 7px;
	color: rgba(255,255,255,.82);
	font-size: 11px;
	letter-spacing: .005em;
	white-space: nowrap;
}

.status-dot {
	width: 5px;
	height: 5px;
	border-radius: 50%;
	background: #c1fe77;
	box-shadow: 0 0 0 3px rgba(193,254,119,.1);
}

.status[data-mode="exact"] .status-dot {
	background: #ffd166;
	box-shadow: 0 0 0 3px rgba(255,209,102,.1);
}

.status-separator {
	margin-left: 4px;
}

.actions { display: inline-flex; gap: 1px; }

.notice {
	position: absolute;
	right: 0;
	bottom: calc(100% + 7px);
	box-sizing: border-box;
	width: max-content;
	max-width: min(330px, calc(100vw - 1rem));
	padding: 8px 10px;
	border: 1px solid rgba(255,209,102,.25);
	border-radius: 9px;
	background: rgba(15,15,15,.97);
	box-shadow: 0 8px 28px rgba(0,0,0,.36);
	color: rgba(255,255,255,.86);
	font-size: 11px;
	line-height: 1.4;
	text-align: left;
	animation: notice 160ms ease-out both;
}

@keyframes enter {
	from { opacity: 0; transform: translateY(7px) scale(.98); }
	to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes notice {
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
	.wrap, .notice { animation: none; }
	.action { transition: none; }
}

@media (forced-colors: active) {
	.pill, .notice { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
	.action, .status { color: CanvasText; }
}
`;
