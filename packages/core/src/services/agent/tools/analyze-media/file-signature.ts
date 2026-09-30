import type { MediaMimeType } from "../../../../libs/lucid-remote/schema/media.js";

const startsWith = (bytes: Buffer, text: string, offset = 0) =>
	bytes.toString("latin1", offset, offset + text.length) === text;

//* text types have no signature, and the analysis model reads them as text
const signatures: Partial<Record<MediaMimeType, (bytes: Buffer) => boolean>> = {
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
	"video/mp4": (bytes) => startsWith(bytes, "ftyp", 4),
	"video/quicktime": (bytes) =>
		startsWith(bytes, "ftyp", 4) ||
		startsWith(bytes, "moov", 4) ||
		startsWith(bytes, "wide", 4),
	"video/webm": (bytes) => startsWith(bytes, "\x1a\x45\xdf\xa3"),
	"video/mpeg": (bytes) =>
		startsWith(bytes, "\x00\x00\x01\xba") ||
		startsWith(bytes, "\x00\x00\x01\xb3"),
};

/** Whether a file's leading bytes match its stored type, so a mislabelled file is never sent for analysis. */
const hasFileSignature = (bytes: Buffer, mimeType: MediaMimeType) =>
	signatures[mimeType]?.(bytes) ?? true;

export default hasFileSignature;
