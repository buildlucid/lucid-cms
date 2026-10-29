import type { EmailDeliveryStatus } from "@types";
import DOMPurify from "dompurify";
import type { PillVariant } from "@/components/Pill/Pill";

export const emailStatusPills: Record<EmailDeliveryStatus, PillVariant> = {
	sent: "success-subtle",
	delivered: "success-subtle",
	opened: "success-subtle",
	clicked: "success-subtle",
	failed: "danger-subtle",
	bounced: "danger-subtle",
	complained: "danger-subtle",
	delayed: "outline",
	scheduled: "outline",
};

const PREVIEW_DISABLE_LINKS_STYLE =
	"<style>a,area{pointer-events:none!important;cursor:default!important;}</style>";

const stripPreviewScripts = (html: string) =>
	html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

const disablePreviewLinkInteractions = (html: string) => {
	if (!html) return html;

	if (/<\/head>/i.test(html)) {
		return html.replace(/<\/head>/i, `${PREVIEW_DISABLE_LINKS_STYLE}</head>`);
	}

	return `${PREVIEW_DISABLE_LINKS_STYLE}${html}`;
};

/** Sanitises rendered email HTML for a sandboxed `srcdoc` preview, removing scripts and embeds and disabling links. */
export const buildSafeEmailHtml = (unsafeHtml: string) => {
	if (typeof window === "undefined") return "";

	try {
		const sanitized = DOMPurify.sanitize(
			stripPreviewScripts(unsafeHtml || ""),
			{
				WHOLE_DOCUMENT: true,
				FORBID_TAGS: [
					"script",
					"noscript",
					"iframe",
					"frame",
					"frameset",
					"object",
					"embed",
					"base",
					"meta",
				],
				FORBID_ATTR: ["srcdoc", "sandbox"],
			},
		);

		return disablePreviewLinkInteractions(sanitized);
	} catch {
		return disablePreviewLinkInteractions(
			stripPreviewScripts(unsafeHtml || ""),
		);
	}
};
