import type { MediaAdapterUploadPart } from "@lucidcms/core/types";
import type { AwsClient } from "aws4fetch";
import { PRESIGNED_URL_EXPIRY, STORAGE_UPLOAD_PATH } from "../../constants.js";
import type { HttpOptions } from "../../types.js";
import { createSignedMediaUrl } from "../../utils/signed-media-url.js";

/** Builds the R2 S3-compatible object URL that aws4fetch signs. */
export const objectUrl = (http: HttpOptions, key: string, query = "") =>
	`${http.endpoint}/${http.bucket}/${key}${query}`;

/** Extracts simple R2 XML response values without adding a runtime XML parser. */
export const extractXmlValue = (xml: string, tag: string) => {
	const match = xml.match(new RegExp(`<${tag}>(.*?)</${tag}>`));
	return match?.[1];
};

/** Converts R2 list-parts XML into Lucid's adapter part shape for resume checks. */
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
 * Uses Lucid's signed internal upload route when R2 only has a binding. Browser
 * uploads can still work, but resumable multipart needs the HTTP fallback.
 */
export const createBindingSingleSession = (
	key: string,
	meta: {
		host: string;
		secretKey: string;
		extension?: string;
	},
) => {
	return {
		mode: "single" as const,
		key,
		url: createSignedMediaUrl({
			host: meta.host,
			path: STORAGE_UPLOAD_PATH,
			key,
			secretKey: meta.secretKey,
			query: {
				extension: meta.extension,
			},
		}),
	};
};

/**
 * Creates an S3-compatible single PUT URL for zero-byte files, avoiding a
 * multipart session that would have no parts to complete.
 */
export const createSingleSession = async (
	client: AwsClient,
	http: HttpOptions,
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
			objectUrl(http, key, `?X-Amz-Expires=${PRESIGNED_URL_EXPIRY}`),
			{
				method: "PUT",
			},
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
