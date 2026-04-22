import type { MediaAdapterServiceRenameKey } from "@lucidcms/core/types";
import type { AwsClient } from "aws4fetch";
import T from "../translations/index.js";
import type { PluginOptions } from "../types/types.js";

export default (client: AwsClient, pluginOptions: PluginOptions) => {
	const rename: MediaAdapterServiceRenameKey = async (props) => {
		try {
			const signObjectRequest = async (
				key: string,
				method: "DELETE" | "HEAD" | "PUT",
				headers?: HeadersInit,
			) =>
				client.sign(
					new Request(
						`${pluginOptions.endpoint}/${pluginOptions.bucket}/${key}`,
						{
							method,
							headers,
						},
					),
				);

			// copy the object to the new key
			const copyReq = await signObjectRequest(props.to, "PUT", {
				"x-amz-copy-source": `/${pluginOptions.bucket}/${props.from}`,
			});
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

			const headReq = await signObjectRequest(props.to, "HEAD");
			const headRes = await fetch(headReq);
			if (!headRes.ok) {
				try {
					const cleanupReq = await signObjectRequest(props.to, "DELETE");
					await fetch(cleanupReq);
				} catch {}

				return {
					error: {
						type: "plugin",
						message: T("copy_failed", {
							status: headRes.status,
							statusText: headRes.statusText,
						}),
					},
					data: undefined,
				};
			}

			// delete the old object
			const deleteReq = await signObjectRequest(props.from, "DELETE");
			const deleteRes = await fetch(deleteReq);
			if (!deleteRes.ok) {
				// delete failed - try to clean up the copy we just made
				try {
					const cleanupReq = await signObjectRequest(props.to, "DELETE");
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
