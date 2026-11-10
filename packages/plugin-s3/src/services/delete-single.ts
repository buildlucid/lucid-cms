import { copy, LucidError } from "@lucidcms/core";
import type { MediaStorageAdapterServiceDeleteSingle } from "@lucidcms/core/types";
import type { AwsClient } from "aws4fetch";
import type { PluginOptions } from "../types/types.js";

export default (client: AwsClient, pluginOptions: PluginOptions) => {
	const deleteSingle: MediaStorageAdapterServiceDeleteSingle = async (
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
				throw new LucidError({
					type: "plugin",
					message: copy("server:plugin.s3.objects.delete.single.failed", {
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

	return deleteSingle;
};
