import T from "../translations/index.js";
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
				return {
					error: {
						type: "plugin",
						message: T("delete_multiple_failed", {
							status: result.status,
							statusText: result.statusText,
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
					message:
						e instanceof Error ? e.message : T("an_unknown_error_occurred"),
				},
				data: undefined,
			};
		}
	};

	return deleteMultiple;
};
