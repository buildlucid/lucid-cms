import { scrypt } from "node:crypto";
import constants from "../../constants/constants.js";

const { N, r, p, dkLen, concurrency } = constants.scrypt;

let running = 0;
const waiting: Array<() => void> = [];

/** Waits for a hashing slot. A released slot passes straight to the next in line. */
const acquireSlot = async (): Promise<void> => {
	if (running < concurrency) {
		running++;
		return;
	}
	await new Promise<void>((resolve) => waiting.push(resolve));
};

const releaseSlot = () => {
	const next = waiting.shift();
	if (next) {
		next();
	} else {
		running--;
	}
};

/**
 * Hashes a password with asynchronous scrypt. Returns base64. Only `constants.scrypt.concurrency`
 * hashes run at once, and the rest wait their turn.
 */
const hashSecret = async (value: string, salt: string): Promise<string> => {
	await acquireSlot();
	try {
		return await new Promise((resolve, reject) => {
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
	} finally {
		releaseSlot();
	}
};

export default hashSecret;
