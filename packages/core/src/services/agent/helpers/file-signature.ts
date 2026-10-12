import type { MediaMimeType } from "../../../libs/lucid-remote/schema/media.js";

const startsWith = (bytes: Buffer, text: string, offset = 0) =>
	bytes.toString("latin1", offset, offset + text.length) === text;

const signatures: Record<MediaMimeType, (bytes: Buffer) => boolean> = {
	"image/png": (bytes) => startsWith(bytes, "\x89PNG\r\n\x1a\n"),
	"image/jpeg": (bytes) => startsWith(bytes, "\xff\xd8\xff"),
	"image/gif": (bytes) =>
		startsWith(bytes, "GIF87a") || startsWith(bytes, "GIF89a"),
	"image/webp": (bytes) =>
		startsWith(bytes, "RIFF") && startsWith(bytes, "WEBP", 8),
	"application/pdf": (bytes) => bytes.subarray(0, 1024).includes("%PDF-"),
	"audio/mpeg": (bytes) =>
		startsWith(bytes, "ID3") ||
		(bytes[0] === 0xff && ((bytes[1] ?? 0) & 0xe0) === 0xe0),
	"audio/wav": (bytes) =>
		startsWith(bytes, "RIFF") && startsWith(bytes, "WAVE", 8),
	"audio/ogg": (bytes) => startsWith(bytes, "OggS"),
	"audio/flac": (bytes) => startsWith(bytes, "fLaC"),
	"audio/mp4": (bytes) => startsWith(bytes, "ftyp", 4),
};

/** Checks whether the file header matches its MIME type. */
const hasFileSignature = (bytes: Buffer, mimeType: MediaMimeType) =>
	signatures[mimeType](bytes);

export default hasFileSignature;
