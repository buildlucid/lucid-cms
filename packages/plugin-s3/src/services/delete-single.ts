import { copy } from "@lucidcms/core/plugin";
import type { MediaAdapterServiceDeleteSingle } from "@lucidcms/core/types";
import type { AwsClient } from "aws4fetch";
import type { PluginOptions } from "../types/types.js";

export default (client: AwsClient, pluginOptions: PluginOptions) => {
	const deleteSingle: MediaAdapterServiceDeleteSingle = async (
		_context,
		{ key },
	) => {
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
				return {
					error: {
						type: "plugin",
						message: copy("server:plugin.s3.objects.delete.single.failed", {
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
					message:
						e instanceof Error
							? copy.literal(e.message)
							: copy("server:plugin.s3.errors.unknown"),
				},
				data: undefined,
			};
		}
	};

	return deleteSingle;
};
