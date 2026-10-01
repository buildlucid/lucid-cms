/**
 * Decodes UTF-8 text, or UTF-16 when the file starts with a byte order mark,
 * as some spreadsheet exports do. Returns null for other encodings and for
 * binary data that happens to decode.
 */
const decodeText = (bytes: Uint8Array): string | null => {
	let encoding = "utf-8";
	if (bytes[0] === 0xff && bytes[1] === 0xfe) encoding = "utf-16le";
	if (bytes[0] === 0xfe && bytes[1] === 0xff) encoding = "utf-16be";

	let text: string;
	try {
		text = new TextDecoder(encoding, { fatal: true }).decode(bytes);
	} catch {
		return null;
	}

	//* control characters other than whitespace only appear in binary data
	return /[^\P{Cc}\t\n\r\f]/u.test(text) ? null : text;
};

export default decodeText;
