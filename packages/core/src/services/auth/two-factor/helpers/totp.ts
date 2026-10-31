import crypto from "node:crypto";
import constants from "../../../../constants/constants.js";
import encodeBase32 from "./base32.js";

const { codeLength, periodSeconds, driftPeriods } = constants.twoFactor;

/** Works out the code for one time step, as RFC 6238 describes. */
const codeForStep = (secret: Buffer, step: number) => {
	const counter = Buffer.alloc(8);
	counter.writeBigUInt64BE(BigInt(step));

	const hmac = crypto.createHmac("sha1", secret).update(counter).digest();
	const offset = hmac.readUInt8(hmac.length - 1) & 0x0f;
	const binary = hmac.readUInt32BE(offset) & 0x7fffffff;

	return (binary % 10 ** codeLength).toString().padStart(codeLength, "0");
};

/**
 * Finds the time step an entered code belongs to, allowing for clock drift.
 * Steps at or before `lastStep` are skipped, so each code only works once.
 */
export const matchTotpCode = (props: {
	secret: Buffer;
	code: string;
	lastStep: number | null;
	time?: number;
}) => {
	const current = Math.floor((props.time ?? Date.now()) / 1000 / periodSeconds);
	const entered = Buffer.from(props.code, "utf8");

	for (
		let step = current - driftPeriods;
		step <= current + driftPeriods;
		step++
	) {
		if (props.lastStep !== null && step <= props.lastStep) continue;

		const expected = Buffer.from(codeForStep(props.secret, step), "utf8");
		if (
			expected.length === entered.length &&
			crypto.timingSafeEqual(expected, entered)
		) {
			return step;
		}
	}
	return null;
};

/**
 * Builds the otpauth:// link that authenticator apps read from the QR code.
 * Parameters are percent-encoded by hand, as some apps show `+` for spaces.
 */
export const createTotpUri = (props: {
	secret: Buffer;
	issuer: string;
	account: string;
}) => {
	//* a colon in the label would split the issuer from the account
	const issuer = encodeURIComponent(props.issuer.replaceAll(":", ""));
	const account = encodeURIComponent(props.account);

	return `otpauth://totp/${issuer}:${account}?secret=${encodeBase32(props.secret)}&issuer=${issuer}`;
};
