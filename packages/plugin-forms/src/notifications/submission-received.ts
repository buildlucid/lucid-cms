import { copy, defineNotification, z } from "@lucidcms/core";
import {
	SUBMISSIONS_COLLECTION_KEY,
	SUBMISSIONS_READ_PERMISSION,
} from "../constants.js";

/**
 * Tells people who can read submissions that a form was sent. Emails follow the notification
 * settings, so they wait a few minutes and skip anyone who has read it by then.
 */
const submissionReceived = defineNotification({
	key: "forms:submission-received",
	category: {
		key: "forms",
		label: copy("admin:plugin.forms.notifications.category"),
	},
	name: copy("admin:plugin.forms.notifications.submission.name"),
	description: copy("admin:plugin.forms.notifications.submission.description"),
	audience: { permission: SUBMISSIONS_READ_PERMISSION },
	data: z.object({
		formName: z.string(),
		summary: z.string(),
		/** Null when the form doesn't store its submissions. */
		submissionId: z.number().nullable(),
	}),
	render: ({ data }) => ({
		title: copy("admin:plugin.forms.notifications.submission.title", {
			data: { form: data.formName },
		}),
		body: data.summary,
		href:
			data.submissionId === null
				? undefined
				: `/admin/collections/${SUBMISSIONS_COLLECTION_KEY}/latest/${data.submissionId}`,
	}),
});

export default submissionReceived;
