import { copy } from "@lucidcms/core";
import { createToolkit } from "@lucidcms/core/toolkit";
import type { ServiceFn } from "@lucidcms/core/types";
import getSubmissionMediaIds from "./get-submission-media-ids.js";

/**
 * Creates a temporary download URL for a file a form stored for a submission. The file must be
 * one the form linked to it, so access to submissions never reaches other media.
 */
const getFileDownload: ServiceFn<
	[{ submissionId: number; mediaId: number }],
	{ url: string }
> = async (context, data) => {
	const linked = await getSubmissionMediaIds(context, {
		submissionIds: [data.submissionId],
		mediaId: data.mediaId,
	});
	if (linked.error) return linked;
	if (linked.data.length === 0) {
		return {
			error: {
				type: "basic",
				status: 404,
				code: "not_found",
				message: copy("server:plugin.forms.file.not.found"),
			},
			data: undefined,
		};
	}

	return createToolkit(context).media.requestDownload({ id: data.mediaId });
};

export default getFileDownload;
