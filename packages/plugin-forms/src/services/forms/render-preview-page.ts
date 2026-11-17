import { previewScripts } from "@lucidcms/client/contract";
import { routes } from "../../constants.js";
import escapeHtml from "../../shared/escape-html.js";
import renderForm, {
	type FormFieldRenderer,
} from "../../shared/render-form.js";
import type { PreviewForm } from "./read-preview-form.js";

/**
 * Plain styles for the builder's preview only, as forms come with none: the 12 columns fields ask
 * for through `data-width`, and controls a site without styles of its own would still want.
 */
const previewStyles = `
*{box-sizing:border-box}
body{margin:0;padding:2rem;min-height:100vh;display:grid;align-content:center;font:16px/1.5 system-ui,sans-serif;color:#18181b;background:#fff}
form,[data-sent]{width:100%;max-width:44rem;margin:0 auto}
[data-fields]{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:1rem}
[data-field]{grid-column:span 12;min-width:0;margin:0;padding:0;border:0}
[data-width="8"]{grid-column:span 8}
[data-width="6"]{grid-column:span 6}
[data-width="4"]{grid-column:span 4}
[data-width="3"]{grid-column:span 3}
[data-field]>label,[data-field]>legend{display:block;font-size:.875rem;font-weight:500;margin-bottom:.375rem;padding:0}
[data-field] [aria-hidden=true]{color:#dc2626}
[data-option]{font-weight:400}
[data-field] input:not([type=checkbox]):not([type=radio]),[data-field] select,[data-field] textarea{width:100%;font:inherit;padding:.5rem .75rem;border:1px solid #d4d4d8;border-radius:.5rem;background:#fff}
[data-help]{margin:.375rem 0 0;font-size:.8125rem;color:#71717a}
[data-submit]{margin-top:1.25rem;font:inherit;font-weight:500;padding:.5rem 1.25rem;border:0;border-radius:.5rem;background:#18181b;color:#fff}
@media (max-width:40rem){[data-field]{grid-column:span 12}}
`.trim();

/**
 * The page the builder's preview frames: the form as websites get it, with field types' own
 * markup and edit marks, the styles
 * above and Lucid's preview script, which updates it as the editor changes the form.
 */
const renderPreviewPage = (
	preview: PreviewForm,
	fields: Record<string, FormFieldRenderer>,
	locale: string,
): string =>
	`<!doctype html><html lang="${escapeHtml(locale)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(preview.form.name)}</title><style>${previewStyles}</style></head><body>${renderForm(
		preview.form,
		//* the preview can't be sent, and Lucid's own script edits it
		{ attributes: preview.attributes, fields, script: false },
	)}<script src="${previewScripts.page.path}"></script><script src="${routes.previewScript}"></script></body></html>`;

export default renderPreviewPage;
