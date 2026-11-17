import { logger, z } from "@lucidcms/core";
import { createToolkit } from "@lucidcms/core/toolkit";
import type { ServiceFn } from "@lucidcms/core/types";
import { EMAIL_TEMPLATE, PLUGIN_KEY } from "../../constants.js";
import type { FormSettings } from "../../types.js";
import renderTokens from "./render-tokens.js";

const address = z.email();

/**
 * Resolves recipient tokens one entry at a time, requiring one valid address per entry to prevent
 * injected recipients.
 */
const readAddresses = (line: string, answers: Record<string, string>) =>
	line
		.split(",")
		.map((entry) => renderTokens(entry, answers).trim())
		.filter((entry) => address.safeParse(entry).success);

/**
 * Queues submission emails with template-escaped answers. Logs and skips invalid recipients
 * without blocking other emails. Returns queued IDs.
 */
const sendEmails: ServiceFn<
	[
		{
			form: FormSettings;
			/** Answers as people read them, keyed by field name. */
			answers: Record<string, string>;
		},
	],
	number[]
> = async (context, data) => {
	const toolkit = createToolkit(context);
	const { form, answers } = data;
	const rows = form.fields.flatMap((formField) => {
		const value = answers[formField.name];
		return value === undefined || value === ""
			? []
			: [{ label: formField.label, value }];
	});
	const ids: number[] = [];

	for (const email of form.emails) {
		const to = readAddresses(email.to, answers);
		if (to.length === 0) {
			logger.warn({
				scope: PLUGIN_KEY,
				message: `An email of form '${form.key}' has no valid recipient, so it wasn't sent`,
			});
			continue;
		}
		const replyTo = email.replyTo
			? readAddresses(email.replyTo, answers)[0]
			: undefined;

		const sent = await toolkit.email.send({
			to: to.join(","),
			subject: renderTokens(email.subject, answers),
			template: EMAIL_TEMPLATE,
			replyTo,
			data: {
				title: form.name,
				paragraphs: email.message
					? renderTokens(email.message, answers, { multiline: true })
							.split(/\r?\n/)
							.filter((line) => line.trim() !== "")
					: [],
				rows,
			},
			//* the email's answers aren't kept in Lucid's email log unless the form keeps submissions. Its subject and recipients always are
			storage: form.store
				? undefined
				: {
						rows: { neverStore: true, previewFallback: [] },
						paragraphs: { neverStore: true, previewFallback: [] },
					},
		});
		if (sent.error) return sent;
		ids.push(sent.data.email.id);
	}

	return { error: undefined, data: ids };
};

export default sendEmails;
