import { serverText } from "@lucidcms/core/plugin";
import type { MediaAdapterServiceDeleteMultiple } from "@lucidcms/core/types";
import type { AwsClient } from "aws4fetch";
import type { PluginOptions } from "../types/types.js";

export default (client: AwsClient, pluginOptions: PluginOptions) => {
	const deleteMultiple: MediaAdapterServiceDeleteMultiple = async (keys) => {
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
				return {
					error: {
						type: "plugin",
						message: serverText("plugin.s3.objects.delete.multiple.failed", {
							data: {
								status: result.status,
								statusText: result.statusText,
							},
						}),
					},
					data: undefined,
				};
			}

			return {
				error: undefined,
				data: undefined,
			};
		} catch (e) {
			return {
				error: {
					type: "plugin",
					message: serverText("plugin.s3.errors.unknown", {
						fallback: e instanceof Error ? e.message : undefined,
					}),
				},
				data: undefined,
			};
		}
	};

	return deleteMultiple;
};
