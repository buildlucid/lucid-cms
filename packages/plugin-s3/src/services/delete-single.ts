import type { AwsClient } from "aws4fetch";
import type { PluginOptions } from "../types/types.js";
import type { MediaStrategyDeleteSingle } from "@lucidcms/core/types";

export default (client: AwsClient, pluginOptions: PluginOptions) => {
	const deletSingle: MediaStrategyDeleteSingle = async (key) => {
		try {
			const response = await client.sign(
				new Request(
					`${pluginOptions.endpoint}/${pluginOptions.bucket}/${key}`,
					{
						method: "DELETE",
					},
				),
			);

			const result = await fetch(response);

			if (!result.ok) {
				throw new Error(`Delete failed: ${result.statusText}`);
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

	return deletSingle;
};
