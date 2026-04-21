import astroConstants from "../../constants.js";

type LucidAdminBarPayload = {
	editHref: string | null;
	editLabel: string | null;
};

const escapeHtmlAttribute = (value: string): string =>
	value
		.replaceAll("&", "&amp;")
		.replaceAll('"', "&quot;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;");

const renderLucidAdminBar = (payload: LucidAdminBarPayload): string => {
	const editAction =
		payload.editHref && payload.editLabel
			? `<a class="lucid-ab__action" href="${escapeHtmlAttribute(payload.editHref)}"><svg class="lucid-ab__icon lucid-ab__icon--sm" viewBox="0 0 512 512" fill="currentColor"><path d="M362.7 19.3L314.3 67.7 444.3 197.7l48.4-48.4c25-25 25-65.5 0-90.5L453.3 19.3c-25-25-65.5-25-90.5 0zm-71 71L58.6 323.5c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l119.8-35.4c14.1-4.2 27-11.8 37.4-22.2L421.7 219.3 291.7 90.3z"/></svg>${escapeHtmlAttribute(payload.editLabel)}</a>`
			: "";
	const separator = editAction
		? '<span class="lucid-ab__sep" aria-hidden="true"></span>'
		: "";
	const actions = editAction
		? `<div class="lucid-ab__actions">${editAction}</div>`
		: "";

	return `<div data-lucid-admin-bar="true">
<style>
@keyframes lucid-ab-in {
\tfrom { opacity: 0; transform: translateY(10px) scale(0.98); }
\tto { opacity: 1; transform: translateY(0) scale(1); }
}

.lucid-ab {
\tposition: fixed;
\tright: 0.75rem;
\tleft: auto;
\tbottom: calc(0.75rem + env(safe-area-inset-bottom, 0px));
\tz-index: 2147483647;
\tdisplay: flex;
\tjustify-content: flex-end;
\tpointer-events: none;
\tmax-width: calc(100vw - 1.5rem);
\tanimation: lucid-ab-in 500ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.lucid-ab__pill {
\tpointer-events: auto;
\tdisplay: inline-flex;
\talign-items: center;
\tgap: 0.125rem;
\tmax-width: 100%;
\tpadding: 0.25rem;
\tborder: 1px solid rgba(193, 254, 119, 0.06);
\tborder-radius: 999px;
\tbackground: rgba(10, 10, 10, 0.94);
\tbackdrop-filter: blur(24px);
\t-webkit-backdrop-filter: blur(24px);
\tbox-shadow:
\t\t0 0 0 1px rgba(255, 255, 255, 0.03),
\t\t0 4px 24px rgba(0, 0, 0, 0.5);
\tcolor: rgba(255, 255, 255, 0.88);
\tfont: 500 13px/1 Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
\t-webkit-font-smoothing: antialiased;
\t-moz-osx-font-smoothing: grayscale;
}

.lucid-ab__brand {
\tdisplay: inline-flex;
\talign-items: center;
\tgap: 0.4rem;
\theight: 1.75rem;
\tpadding: 0 0.5rem 0 0.4rem;
\tcolor: inherit;
\ttext-decoration: none;
\tborder-radius: 999px;
\ttransition: background 200ms ease;
}

.lucid-ab__brand:hover {
\tbackground: rgba(255, 255, 255, 0.05);
}

.lucid-ab__brand-mark {
\twidth: 0.5rem;
\theight: 0.5rem;
\tborder-radius: 0.175rem;
\tbackground: #C1FE77;
\tflex-shrink: 0;
\tbox-shadow: 0 0 6px rgba(193, 254, 119, 0.3);
}

.lucid-ab__brand-label {
\tfont-size: 13px;
\tfont-weight: 600;
\tletter-spacing: -0.01em;
\tcolor: rgba(255, 255, 255, 0.9);
}

.lucid-ab__sep {
\twidth: 1px;
\theight: 0.875rem;
\tmargin: 0 0.125rem;
\tbackground: rgba(255, 255, 255, 0.08);
\tflex-shrink: 0;
}

.lucid-ab__actions {
\tdisplay: flex;
\talign-items: center;
\tgap: 0.125rem;
}

.lucid-ab__action {
\tdisplay: inline-flex;
\talign-items: center;
\tjustify-content: center;
\tgap: 0.375rem;
\theight: 1.75rem;
\tpadding: 0 0.625rem;
\tborder: none;
\tborder-radius: 999px;
\tbackground: transparent;
\tcolor: rgba(255, 255, 255, 0.55);
\ttext-decoration: none;
\tfont: inherit;
\tfont-size: 13px;
\tcursor: pointer;
\twhite-space: nowrap;
\ttransition: background 200ms ease, color 200ms ease;
}

.lucid-ab__action:hover {
\tbackground: rgba(255, 255, 255, 0.06);
\tcolor: rgba(255, 255, 255, 0.92);
}

.lucid-ab__icon {
\twidth: 11px;
\theight: 11px;
\tdisplay: block;
\tflex-shrink: 0;
}

.lucid-ab__icon--sm {
\twidth: 10px;
\theight: 10px;
}

@media (max-width: 720px) {
\t.lucid-ab {
\t\tright: 0.5rem;
\t\tmax-width: calc(100vw - 1rem);
\t\tbottom: calc(0.5rem + env(safe-area-inset-bottom, 0px));
\t}
}

@media (prefers-reduced-motion: reduce) {
\t.lucid-ab {
\t\tanimation: none;
\t}
}
</style>
<div class="lucid-ab">
\t<div class="lucid-ab__pill">
\t\t<a class="lucid-ab__brand" href="${escapeHtmlAttribute(astroConstants.paths.mountPath)}">
\t\t\t<span class="lucid-ab__brand-mark" aria-hidden="true"></span>
\t\t\t<span class="lucid-ab__brand-label">Lucid CMS</span>
\t\t</a>
\t\t${separator}
\t\t${actions}
\t</div>
</div>
</div>`;
};

export const injectLucidAdminBarIntoHtml = (
	html: string,
	payload: LucidAdminBarPayload,
): string => {
	if (html.includes('data-lucid-admin-bar="true"')) {
		return html;
	}

	const barMarkup = renderLucidAdminBar(payload);
	return html.includes("</body>")
		? html.replace("</body>", `${barMarkup}</body>`)
		: `${html}${barMarkup}`;
};
