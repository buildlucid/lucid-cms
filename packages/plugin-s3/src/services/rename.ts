import { copy, LucidError } from "@lucidcms/core";
import type { MediaStorageAdapterServiceRenameKey } from "@lucidcms/core/types";
import type { AwsClient } from "aws4fetch";
import type { PluginOptions } from "../types/types.js";

export default (client: AwsClient, pluginOptions: PluginOptions) => {
	const rename: MediaStorageAdapterServiceRenameKey = async (
		_context,
		props,
	) => {
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
				throw new LucidError({
					type: "plugin",
					message: copy("server:plugin.s3.objects.copy.failed", {
						data: {
							status: copyRes.status,
							statusText: copyRes.statusText,
						},
					}),
				});
			}

			const headReq = await signObjectRequest(props.to, "HEAD");
			const headRes = await fetch(headReq);
			if (!headRes.ok) {
				try {
					const cleanupReq = await signObjectRequest(props.to, "DELETE");
					await fetch(cleanupReq);
				} catch {}

				throw new LucidError({
					type: "plugin",
					message: copy("server:plugin.s3.objects.copy.failed", {
						data: {
							status: headRes.status,
							statusText: headRes.statusText,
						},
					}),
				});
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

				throw new LucidError({
					type: "plugin",
					message: copy("server:plugin.s3.objects.delete.failed", {
						data: {
							status: deleteRes.status,
							statusText: deleteRes.statusText,
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
	return rename;
};
