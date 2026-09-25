/** Adds fixed decimal credits exactly; the grouped amount can represent several calls. */
const sumCredits = (left: string, right: string, count = 1) => {
	const [leftWhole = "0", leftFraction = ""] = left.split(".");
	const [rightWhole = "0", rightFraction = ""] = right.split(".");
	const scale = Math.max(leftFraction.length, rightFraction.length);
	const total =
		BigInt(leftWhole + leftFraction.padEnd(scale, "0")) +
		BigInt(rightWhole + rightFraction.padEnd(scale, "0")) * BigInt(count);

	if (!scale) return total.toString();

	const digits = total.toString().padStart(scale + 1, "0");

	return `${digits.slice(0, -scale)}.${digits.slice(-scale)}`.replace(
		/\.?0+$/,
		"",
	);
};
export default sumCredits;
