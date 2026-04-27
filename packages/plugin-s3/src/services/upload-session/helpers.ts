import type { MediaAdapterUploadPart } from "@lucidcms/core/types";
import type { AwsClient } from "aws4fetch";
import { PRESIGNED_URL_EXPIRY } from "../../constants.js";
import type { PluginOptions } from "../../types/types.js";

/** Builds the S3 object URL that aws4fetch signs for multipart operations. */
export const objectUrl = (
	pluginOptions: PluginOptions,
	key: string,
	query = "",
) => `${pluginOptions.endpoint}/${pluginOptions.bucket}/${key}${query}`;

/** Extracts simple S3 XML response values without adding a runtime XML parser. */
export const extractXmlValue = (xml: string, tag: string) => {
	const match = xml.match(new RegExp(`<${tag}>(.*?)</${tag}>`));
	return match?.[1];
};

/** Converts S3 list-parts XML into Lucid's adapter part shape for resume checks. */
export const parseParts = (xml: string): MediaAdapterUploadPart[] => {
	return Array.from(xml.matchAll(/<Part>([\s\S]*?)<\/Part>/g)).map((match) => {
		const partXml = match[1] ?? "";
		return {
			partNumber: Number(extractXmlValue(partXml, "PartNumber") ?? 0),
			etag: (extractXmlValue(partXml, "ETag") ?? "").replace(/"/g, ""),
			size: Number(extractXmlValue(partXml, "Size") ?? 0),
		};
	});
};

/**
 * Falls back to Lucid's single-upload contract for zero-byte files, where an S3
 * multipart session cannot produce meaningful parts.
 */
export const createSingleUploadSession = async (
	client: AwsClient,
	pluginOptions: PluginOptions,
	key: string,
	meta: {
		mimeType: string;
		extension?: string;
	},
) => {
	const headers = new Headers();
	if (meta.mimeType) headers.set("Content-Type", meta.mimeType);
	if (meta.extension) headers.set("x-amz-meta-extension", meta.extension);

	const response = await client.sign(
		new Request(
			objectUrl(pluginOptions, key, `?X-Amz-Expires=${PRESIGNED_URL_EXPIRY}`),
			{ method: "PUT" },
		),
		{
			headers,
			aws: { signQuery: true },
		},
	);

	return {
		mode: "single" as const,
		key,
		url: response.url.toString(),
		headers: Object.fromEntries(response.headers.entries()),
	};
};
