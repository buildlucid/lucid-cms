import { defineHookEvents } from "@lucidcms/core";
import type { EffectHookEvent, TransformHookEvent } from "@lucidcms/core/types";
import type { FormSettings, FormValues, SubmissionFile } from "../types.js";

/** The form a submission is for. */
export type FormsSubmitHookMeta = {
	form: FormSettings;
};

/** A submission's answers once they passed the form's checks, keyed by field name. */
export type FormsBeforeSubmitHookData = {
	values: FormValues;
};

/** A submission that was accepted. */
export type FormsAfterSubmitHookData = {
	values: FormValues;
	/** The media stored for the submission's file fields. */
	files: SubmissionFile[];
	/** The stored submission's document ID, or null when the form doesn't store them. */
	submissionId: number | null;
};

declare module "@lucidcms/core/types" {
	interface PluginHookEvents {
		forms: {
			/**
			 * Runs once a submission passed its spam checks and validation, before files are stored.
			 * Change `values` to change what is stored and sent, or throw a LucidError to refuse it.
			 */
			beforeSubmit: TransformHookEvent<
				FormsSubmitHookMeta,
				FormsBeforeSubmitHookData
			>;
			/**
			 * Runs once a submission is stored and its emails are queued, in the same transaction, eg.
			 * to add the person to a mailing list. Throwing undoes the submission.
			 */
			afterSubmit: EffectHookEvent<
				FormsSubmitHookMeta,
				FormsAfterSubmitHookData
			>;
		};
	}
}

/** Hook events projects and plugins can subscribe to with `service: "forms"`. */
export default defineHookEvents({
	key: "forms",
	events: { beforeSubmit: "transform", afterSubmit: "effect" },
});
