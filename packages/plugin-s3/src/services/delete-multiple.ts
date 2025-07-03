import type { AwsClient } from "aws4fetch";
import type { PluginOptions } from "../types/types.js";
import type { MediaStrategyDeleteMultiple } from "@lucidcms/core/types";

export default (client: AwsClient, pluginOptions: PluginOptions) => {
	const deleteMultiple: MediaStrategyDeleteMultiple = async (keys) => {
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
				throw new Error(`Delete multiple failed: ${result.statusText}`);
			}

			return {
				error: undefined,
				data: undefined,
			};
		} catch (e) {
			const error = e as Error;
			return {
				error: {
					message: error.message,
				},
				data: undefined,
			};
		}
	};

	return deleteMultiple;
};
