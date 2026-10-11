import type { ServiceFn } from "../../../../utils/services/types.js";
import { copy } from "../../../i18n/index.js";
import { getLucidRemoteClient } from "../../client.js";
import { lucidRemotePaths } from "../../constants.js";

export type GeneratedImage = {
	body: ReadableStream<Uint8Array>;
	contentType: string;
	contentLength: number | undefined;
};

/** Opens a generated image using its connection's access token. */
const getGeneratedImage: ServiceFn<
	[{ accessToken: string; storageKey: string; signal?: AbortSignal }],
	GeneratedImage
> = async (context, props) => {
	const response = await getLucidRemoteClient(context).stream(
		`${lucidRemotePaths.getCmsAiImage}/${encodeURIComponent(props.storageKey)}`,
		{ accessToken: props.accessToken, signal: props.signal },
	);
	if (response.error) return response;

	const { body, headers } = response.data;
	if (!body) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 502,
				message: copy("server:core.ai.remote.generation.not.found.message"),
			},
		};
	}

	const length = Number(headers.get("content-length"));
	return {
		error: undefined,
		data: {
			body,
			contentType: headers.get("content-type") ?? "application/octet-stream",
			contentLength: Number.isFinite(length) && length > 0 ? length : undefined,
		},
	};
};

export default getGeneratedImage;
