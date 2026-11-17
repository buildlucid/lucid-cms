import type { LucidHonoContext } from "@lucidcms/core/types";
import { formId } from "../shared/render-form.js";
import type { FormConfirmation } from "../types.js";

const parse = (value: string | undefined, base?: string): URL | null => {
	try {
		return new URL(value ?? "", base);
	} catch {
		return null;
	}
};

/**
 * The page a browser posted the form from. Browsers posting to another origin only say which
 * site they came from, so the form's own `_return` names the page. It is only used when it is on
 * that site, so a form can't send people anywhere else.
 */
const readReturnPage = (
	hono: LucidHonoContext,
	returnUrl: string | null,
): URL | null => {
	const referer = parse(hono.req.header("referer"));
	const origin = parse(hono.req.header("origin"))?.origin ?? referer?.origin;
	if (returnUrl !== null && origin !== undefined) {
		const page = parse(returnUrl, origin);
		if (page?.origin === origin) return page;
	}

	return referer;
};

/**
 * Where a browser that posted the form itself goes next: the form's redirect, read against the
 * page it came from, or back to the form on that page with `?form=<key>&status=sent` for the
 * site to show the message. Failures go back with `status=error`. Null when the request doesn't say where it
 * came from.
 */
const resolveReturnUrl = (
	hono: LucidHonoContext,
	props: {
		key: string;
		returnUrl: string | null;
		outcome: { confirmation: FormConfirmation } | { error: true };
	},
): string | null => {
	const page = readReturnPage(hono, props.returnUrl);
	const { outcome } = props;
	if ("confirmation" in outcome && outcome.confirmation.type === "redirect") {
		return (
			parse(outcome.confirmation.url, page?.toString())?.toString() ?? null
		);
	}
	if (page === null) return null;

	page.searchParams.set("form", props.key);
	page.searchParams.set("status", "error" in outcome ? "error" : "sent");
	//* back to the form, rather than the top of the page
	page.hash = formId(props.key);
	return page.toString();
};

export default resolveReturnUrl;
