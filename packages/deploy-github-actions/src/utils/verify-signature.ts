import crypto from "node:crypto";

/** Checks GitHub's `X-Hub-Signature-256` header against the raw body in constant time. */
const verifySignature = (props: {
	secret: string;
	body: string;
	signature: string | null;
}) => {
	if (!props.signature?.startsWith("sha256=")) return false;

	const expected = Buffer.from(
		crypto.createHmac("sha256", props.secret).update(props.body).digest("hex"),
		"hex",
	);
	const actual = Buffer.from(props.signature.slice("sha256=".length), "hex");

	return (
		actual.length === expected.length &&
		crypto.timingSafeEqual(actual, expected)
	);
};

export default verifySignature;
