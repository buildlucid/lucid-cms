import { scrypt } from "node:crypto";
import constants from "../../constants/constants.js";

const { N, r, p, dkLen } = constants.scrypt;

/** Hashes a password or key with scrypt off the main thread, so other requests keep running. Returns base64. */
const hashSecret = (value: string, salt: string): Promise<string> =>
	new Promise((resolve, reject) => {
		//* scrypt needs 128 * N * r bytes, which is above Node's 32 MiB default limit
		scrypt(
			value,
			salt,
			dkLen,
			{ N, r, p, maxmem: 256 * N * r },
			(error, key) => {
				if (error) {
					reject(error);
					return;
				}
				resolve(key.toString("base64"));
			},
		);
	});

export default hashSecret;
