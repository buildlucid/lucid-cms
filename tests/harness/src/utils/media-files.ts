import { crc32, deflateSync } from "node:zlib";

/** A file to upload, as a browser would send it. */
export type MediaFile = {
	name: string;
	mimeType: string;
	bytes: Uint8Array<ArrayBuffer>;
};

const encode = (text: string) => new TextEncoder().encode(text);

/** A PNG chunk: length, type, data and the CRC of type and data. */
const pngChunk = (type: string, data: Uint8Array) => {
	const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
	const length = Buffer.alloc(4);
	length.writeUInt32BE(data.length);
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(crc32(body));
	return Buffer.concat([length, body, crc]);
};

/** A real JPEG Sharp made: 8 by 6 pixels, red. */
const JPEG = Buffer.from(
	"/9j/2wBDABALDA4MChAODQ4SERATGCgaGBYWGDEjJR0oOjM9PDkzODdASFxOQERXRTc4UG1RV19iZ2hnPk1xeXBkeFxlZ2P/2wBDARESEhgVGC8aGi9jQjhCY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2P/wAARCAAGAAgDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAABAb/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCWAEpn/9k=",
	"base64",
);

/**
 * Small files of each kind, made in code. Each has the bytes its type is detected by, so the CMS
 * reads the same type the name and MIME type claim, unless a test says otherwise. Tests upload
 * them, seeds store them and the fake Lucid API hands them back as generated media.
 */
export const files = {
	/** A text file. Its type can't be detected from its bytes, so the CMS trusts the MIME type. */
	text: (content = "Hello\n", name = "note.txt"): MediaFile => ({
		name,
		mimeType: "text/plain",
		bytes: encode(content),
	}),
	/** A text file of exactly `size` bytes, for size limits. */
	sized: (size: number): MediaFile => ({
		name: `sized-${size}.txt`,
		mimeType: "text/plain",
		bytes: encode("x".repeat(size)),
	}),
	/** A solid-colour PNG of the given size. `shade` changes its bytes for a replacement. */
	png: (
		options: { width?: number; height?: number; shade?: number } = {},
	): MediaFile => {
		const width = options.width ?? 8;
		const height = options.height ?? 6;
		const header = Buffer.alloc(13);
		header.writeUInt32BE(width, 0);
		header.writeUInt32BE(height, 4);
		//* 8-bit RGB, no interlacing
		header.set([8, 2, 0, 0, 0], 8);
		const row = Buffer.alloc(1 + width * 3, options.shade ?? 90);
		row[0] = 0;
		return {
			name: "image.png",
			mimeType: "image/png",
			bytes: Buffer.concat([
				Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
				pngChunk("IHDR", header),
				pngChunk(
					"IDAT",
					deflateSync(Buffer.concat(Array.from({ length: height }, () => row))),
				),
				pngChunk("IEND", new Uint8Array()),
			]),
		};
	},
	jpeg: (): MediaFile => ({
		name: "photo.jpg",
		mimeType: "image/jpeg",
		bytes: JPEG,
	}),
	svg: (body = '<rect width="4" height="4"/>'): MediaFile => ({
		name: "drawing.svg",
		mimeType: "image/svg+xml",
		bytes: encode(
			`<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4">${body}</svg>`,
		),
	}),
	/** A page that runs a script when opened, for checking the CDN never lets it. */
	html: (): MediaFile => ({
		name: "page.html",
		mimeType: "text/html",
		bytes: encode("<!doctype html><script>window.ran = true</script>"),
	}),
	pdf: (): MediaFile => ({
		name: "document.pdf",
		mimeType: "application/pdf",
		bytes: encode(
			"%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
		),
	}),
	/** An ID3 tag then one silent MPEG audio frame. */
	mp3: (): MediaFile => ({
		name: "sound.mp3",
		mimeType: "audio/mpeg",
		bytes: Buffer.concat([
			Buffer.from("ID3"),
			Buffer.from([3, 0, 0, 0, 0, 0, 0]),
			Buffer.from([0xff, 0xfb, 0x90, 0x64]),
			Buffer.alloc(413),
		]),
	}),
	/** An MP4 file type box, which is what detection reads. */
	mp4: (): MediaFile => ({
		name: "clip.mp4",
		mimeType: "video/mp4",
		bytes: Buffer.concat([
			Buffer.from([0, 0, 0, 0x18]),
			Buffer.from("ftypisom"),
			Buffer.from([0, 0, 2, 0]),
			Buffer.from("isommp41"),
		]),
	}),
};
