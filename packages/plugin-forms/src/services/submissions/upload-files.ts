import { createToolkit } from "@lucidcms/core/toolkit";
import type { ServiceFn } from "@lucidcms/core/types";
import type { SubmissionFile } from "../../types.js";
import resolveMaxBytes from "./resolve-max-bytes.js";
import type { AcceptedFiles } from "./validate-files.js";

/**
 * Stores uploads as system media outside the library, private unless the field is public. Run in
 * the submission transaction so rollback removes files.
 */
const uploadFiles: ServiceFn<
	[{ accepted: AcceptedFiles[] }],
	SubmissionFile[]
> = async (context, data) => {
	const toolkit = createToolkit(context);
	const stored: SubmissionFile[] = [];

	for (const { field, files } of data.accepted) {
		const isPublic = field.settings.public === true;
		for (const file of files) {
			const uploaded = await toolkit.media.uploadFile({
				file,
				isSystem: true,
				public: isPublic,
				validation: {
					maxBytes: resolveMaxBytes(
						field,
						context.config.media.limits.uploadBytes,
					),
				},
			});
			if (uploaded.error) return uploaded;

			stored.push({
				field: field.name,
				mediaId: uploaded.data.id,
				fileName: file.name,
				public: isPublic,
			});
		}
	}

	return { error: undefined, data: stored };
};

export default uploadFiles;
