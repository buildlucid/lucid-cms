import { copy, LucidError } from "@lucidcms/core";
import type { MediaStorageAdapterServiceDeleteMultiple } from "@lucidcms/core/types";
import type { AwsClient } from "aws4fetch";
import type { PluginOptions } from "../types/types.js";

export default (client: AwsClient, pluginOptions: PluginOptions) => {
	const deleteMultiple: MediaStorageAdapterServiceDeleteMultiple = async (
		_context,
		{ keys },
	) => {
		try {
			const deleteXml = `<?xml version="1.0" encoding="UTF-8"?>
<Delete>
${keys.map((key) => `<Object><Key>${key}</Key></Object>`).join("")}
</Delete>`;

			const response = await client.sign(
				new Request(
					`${pluginOptions.endpoint}/${pluginOptions.bucket}?delete`,
					{
						method: "POST",
						body: deleteXml,
						headers: {
							"Content-Type": "application/xml",
						},
					},
				),
			);

			const result = await fetch(response);

			if (!result.ok) {
				throw new LucidError({
					type: "plugin",
					message: copy("server:plugin.s3.objects.delete.multiple.failed", {
						data: {
							status: result.status,
							statusText: result.statusText,
						},
					}),
				});
			}

			return;
		} catch (e) {
			if (e instanceof LucidError) throw e;
			throw new LucidError({
				type: "plugin",
				message:
					e instanceof Error
						? copy.literal(e.message)
						: copy("server:plugin.s3.errors.unknown"),
			});
		}
	};

	return deleteMultiple;
};
