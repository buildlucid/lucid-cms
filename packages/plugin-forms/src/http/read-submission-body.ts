import { copy, LucidError } from "@lucidcms/core";
import type { LucidHonoContext } from "@lucidcms/core/types";
import { spam } from "../constants.js";
import isRecord from "../shared/is-record.js";

/** What a posted form holds, whichever way it was sent. */
type SubmissionBody = {
	values: Record<string, unknown>;
	files: Record<string, File[]>;
	captchaToken: string | null;
	/** The page the form says it was posted from, for browsers that post it themselves. */
	returnUrl: string | null;
};

/**
 * Reads a submission from a JSON object or a posted form, splitting a form's files, captcha token
 * and return page from its answers. The token comes from the `Lucid-Captcha-Token` header, or
 * else the body. Throws for a body that is neither, or that can't be parsed, so nothing is ever
 * stored from one.
 */
const readSubmissionBody = async (
	hono: LucidHonoContext,
): Promise<SubmissionBody> => {
	const values: Record<string, unknown> = {};
	const files: Record<string, File[]> = {};
	const contentType = (hono.req.header("content-type") ?? "").toLowerCase();

	if (contentType.includes("application/json")) {
		const body: unknown = await hono.req.json().catch(() => undefined);
		if (!isRecord(body)) {
			throw new LucidError({
				type: "basic",
				status: 400,
				message: copy("server:plugin.forms.submit.unreadable"),
			});
		}
		Object.assign(values, body);
	} else if (
		contentType.includes("multipart/form-data") ||
		contentType.includes("application/x-www-form-urlencoded")
	) {
		const body = await hono.req.parseBody({ all: true }).catch(() => {
			throw new LucidError({
				type: "basic",
				status: 400,
				message: copy("server:plugin.forms.submit.unreadable"),
			});
		});
		for (const [name, value] of Object.entries(body)) {
			const items = Array.isArray(value) ? value : [value];
			const posted = items.filter((item) => item instanceof File);
			if (posted.length > 0) {
				files[name] = posted;
				continue;
			}
			//* fields posted more than once, such as a group of checkboxes, arrive as a list
			values[name] = value;
		}
	} else {
		throw new LucidError({
			type: "basic",
			status: 415,
			message: copy("server:plugin.forms.submit.unreadable"),
		});
	}

	const {
		[spam.captchaField]: bodyToken,
		[spam.returnField]: returnUrl,
		...answers
	} = values;
	const token = hono.req.header(spam.captchaHeader) ?? bodyToken;

	return {
		values: answers,
		files,
		captchaToken: typeof token === "string" ? token : null,
		returnUrl: typeof returnUrl === "string" ? returnUrl : null,
	};
};

export default readSubmissionBody;
