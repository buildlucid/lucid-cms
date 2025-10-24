import type { MediaAdapterServiceRenameKey } from "@lucidcms/core/types";
import type { AwsClient } from "aws4fetch";
import T from "../translations/index.js";
import type { PluginOptions } from "../types/types.js";

export default (client: AwsClient, pluginOptions: PluginOptions) => {
	const rename: MediaAdapterServiceRenameKey = async (props) => {
		try {
			// copy the object to the new key
			const copyReq = await client.sign(
				new Request(
					`${pluginOptions.endpoint}/${pluginOptions.bucket}/${props.to}`,
					{
						method: "PUT",
						headers: {
							"x-amz-copy-source": `/${pluginOptions.bucket}/${props.from}`,
						},
					},
				),
			);
			const copyRes = await fetch(copyReq);
			if (!copyRes.ok) {
				return {
					error: {
						type: "plugin",
						message: T("copy_failed", {
							status: copyRes.status,
							statusText: copyRes.statusText,
						}),
					},
					data: undefined,
				};
			}

			// delete the old object
			const deleteReq = await client.sign(
				new Request(
					`${pluginOptions.endpoint}/${pluginOptions.bucket}/${props.from}`,
					{
						method: "DELETE",
					},
				),
			);
			const deleteRes = await fetch(deleteReq);
			if (!deleteRes.ok) {
				// delete failed - try to clean up the copy we just made
				try {
					const cleanupReq = await client.sign(
						new Request(
							`${pluginOptions.endpoint}/${pluginOptions.bucket}/${props.to}`,
							{
								method: "DELETE",
							},
						),
					);
					await fetch(cleanupReq);
				} catch {}

				return {
					error: {
						type: "plugin",
						message: T("delete_failed", {
							status: deleteRes.status,
							statusText: deleteRes.statusText,
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
	return rename;
};
