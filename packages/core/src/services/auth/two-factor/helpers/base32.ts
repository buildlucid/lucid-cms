const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** Encodes bytes as unpadded RFC 4648 base32, the format authenticator apps take secrets in. */
const encodeBase32 = (bytes: Uint8Array) => {
	let output = "";
	let buffer = 0;
	let bits = 0;

	for (const byte of bytes) {
		buffer = ((buffer << 8) | byte) & 0xffff;
		bits += 8;
		while (bits >= 5) {
			output += alphabet[(buffer >>> (bits - 5)) & 31];
			bits -= 5;
		}
	}
	if (bits > 0) output += alphabet[(buffer << (5 - bits)) & 31];

	return output;
};

export default encodeBase32;
