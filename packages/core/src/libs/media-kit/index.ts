import T from "../../translations/index.js";
import mime from "mime-types";
import sharp from "sharp";
import slug from "slug";
import { encode } from "blurhash";
import { getAverageColor } from "fast-average-color-node";
import { getMonth, getYear } from "date-fns";
import type { Readable } from "node:stream";
import type { Config, MediaType } from "../../types.js";
import type { ServiceResponse } from "../../utils/services/types.js";
import type { BooleanInt } from "../db/types.js";

export interface MediaKitMeta {
	mimeType: string;
	name: string;
	type: MediaType;
	extension: string;
	size: number;
	key: string;
	etag: string | null;
	// image meta
	width: number | null;
	height: number | null;
	blurHash: string | null;
	averageColour: string | null;
	isDark: BooleanInt | null;
	isLight: BooleanInt | null;
}

class MediaKit {
	config: Config["media"];

	name: string | null = null;
	type: MediaType = "unknown";
	mimeType: string | null = null;
	extension: string | null = null;
	size: number | null = null;
	key: string | null = null;
	etag: string | null = null;
	// image meta
	blurHash: string | null = null;
	width: number | null = null;
	height: number | null = null;
	averageColour: string | null = null;
	isDark: boolean | null = null;
	isLight: boolean | null = null;

	constructor(config: Config["media"]) {
		this.config = config;
	}

	public async injectFile(props: {
		streamFile: () => ServiceResponse<{
			contentLength: number | undefined;
			contentType: string | undefined;
			body: Readable;
		}>;
		key: string;
		mimeType: string | null;
		fileName: string;
		size: number;
		etag: string | null;
	}): ServiceResponse<MediaKitMeta> {
		this.mimeType = props.mimeType;
		this.name = props.fileName;
		this.type = this.getMediaType(this.mimeType);
		this.extension =
			mime.extension(this.mimeType ?? "") ||
			props.fileName.split(".").pop() ||
			"";
		this.key = props.key;
		this.size = props.size;
		this.etag = props.etag;

		if (this.mimeType === undefined || this.mimeType === null) {
			this.mimeType = mime.lookup(this.extension) || null;
		}
		if (this.mimeType === undefined || this.mimeType === null) {
			return {
				error: {
					type: "basic",
					name: T("media_error_getting_metadata"),
					message: T("media_error_getting_metadata"),
					status: 500,
				},
				data: undefined,
			};
		}

		const metaRes = await this.typeSpecificMeta(props.streamFile);
		if (metaRes.error) return metaRes;

		return {
			error: undefined,
			data: {
				mimeType: this.mimeType,
				name: this.name,
				type: this.type,
				extension: this.extension,
				size: this.size,
				key: this.key,
				etag: this.etag,
				width: this.width,
				height: this.height,
				blurHash: this.blurHash,
				averageColour: this.averageColour,
				isDark: this.isDark === null ? null : this.isDark ? 1 : 0,
				isLight: this.isLight === null ? null : this.isLight ? 1 : 0,
			},
		};
	}

	// ----------------------------------------
	// Helpers
	public getMediaType(mimeType?: string | null): MediaType {
		const mt = mimeType?.toLowerCase();
		if (!mt) return "unknown";
		if (mt.includes("image")) return "image";
		if (mt.includes("video")) return "video";
		if (mt.includes("audio")) return "audio";
		if (mt.includes("pdf") || mt.startsWith("application/vnd"))
			return "document";
		if (mt.includes("zip") || mt.includes("tar")) return "archive";
		return "unknown";
	}
	public static generateKey(props: {
		name: string;
		extension: string | null;
	}): Awaited<ServiceResponse<string>> {
		const [name, extension] = props.name.split(".");
		const ext = props.extension || extension;

		if (!name || !ext) {
			return {
				error: {
					type: "basic",
					name: T("media_name_invalid"),
					message: T("media_name_invalid"),
					status: 400,
				},
				data: undefined,
			};
		}

		let filename = slug(name, {
			lower: true,
		});
		if (filename.length > 254) filename = filename.slice(0, 254);
		const uuid = Math.random().toString(36).slice(-6);
		const date = new Date();
		const month = getMonth(date);
		const monthF = month + 1 >= 10 ? `${month + 1}` : `0${month + 1}`;

		return {
			error: undefined,
			data: `${getYear(date)}/${monthF}/${uuid}-${filename}.${ext}`,
		};
	}

	// ----------------------------------------
	// Private
	private async typeSpecificMeta(
		streamFile: () => ServiceResponse<{
			contentLength: number | undefined;
			contentType: string | undefined;
			body: Readable;
		}>,
	): ServiceResponse<undefined> {
		try {
			switch (this.type) {
				case "image": {
					const fileStreamRes = await streamFile();
					if (fileStreamRes.error) return fileStreamRes;

					const transform = sharp();
					fileStreamRes.data.body?.pipe(transform);
					const meta = await transform.metadata();

					this.width = meta.width || null;
					this.height = meta.height || null;

					const [hashBuffer, acBuffer] = await Promise.all([
						transform
							.raw()
							.resize({
								width: 100,
							})
							.ensureAlpha()
							.toBuffer({ resolveWithObject: true }),
						transform
							.webp({ quality: 80 })
							.resize({
								width: 100,
							})
							.toBuffer({ resolveWithObject: true }),
					]);

					this.blurHash = encode(
						new Uint8ClampedArray(hashBuffer.data),
						hashBuffer.info.width,
						hashBuffer.info.height,
						4,
						4,
					);

					const averageRes = await getAverageColor(acBuffer.data);
					this.averageColour = averageRes.rgba;
					this.isDark = averageRes.isDark;
					this.isLight = averageRes.isLight;
				}
			}

			return {
				error: undefined,
				data: undefined,
			};
		} catch (error) {
			return {
				error: {
					type: "basic",
					name: T("media_error_getting_metadata"),
					message:
						// @ts-expect-error
						error?.message || T("media_error_getting_metadata"),
					status: 500,
				},
				data: undefined,
			};
		}
	}
}

export default MediaKit;
