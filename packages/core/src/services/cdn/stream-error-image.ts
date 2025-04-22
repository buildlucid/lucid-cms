import T from "../../translations/index.js";
import path from "node:path";
import { createReadStream, type ReadStream } from "node:fs";
import pipeRemoteUrl from "./helpers/pipe-remote-url.js";
import { getDirName } from "../../utils/helpers/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { LucidErrorData } from "../../types/errors.js";

const currentDir = getDirName(import.meta.url);

const streamErrorImage: ServiceFn<
	[
		{
			fallback?: boolean;
			error: LucidErrorData;
		},
	],
	{
		body: ReadStream | Buffer;
		contentType: string;
	}
> = async (context, data) => {
	if (data.error.status !== 404) {
		return {
			error: data.error,
			data: undefined,
		};
	}

	if (context.config.media?.fallbackImage === false || !data.fallback) {
		return {
			error: {
				type: "basic",
				name: T("media_not_found_name"),
				message: T("media_not_found_message"),
				status: 404,
			},
			data: undefined,
		};
	}

	if (context.config.media?.fallbackImage === undefined) {
		return {
			error: undefined,
			data: pipeLocalImage(),
		};
	}

	try {
		const { buffer, contentType } = await pipeRemoteUrl({
			url: context.config.media?.fallbackImage as string,
		});

		return {
			error: undefined,
			data: {
				body: buffer,
				contentType: contentType || "image/jpeg",
			},
		};
	} catch (err) {
		return {
			error: undefined,
			data: pipeLocalImage(),
		};
	}
};

const pipeLocalImage = () => {
	const pathVal = path.join(currentDir, "../assets/404.jpg");
	const contentType = "image/jpeg";
	const steam = createReadStream(pathVal);
	return {
		body: steam,
		contentType: contentType,
	};
};

export default streamErrorImage;
