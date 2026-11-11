/** Reads platform methods at the host boundary and preserves their receivers. */
const parseExecutionContext = (input: unknown) => {
	if (
		typeof input !== "object" ||
		input === null ||
		!("waitUntil" in input) ||
		typeof input.waitUntil !== "function"
	) {
		return null;
	}

	const waitUntil = input.waitUntil;
	const passThroughOnException =
		"passThroughOnException" in input &&
		typeof input.passThroughOnException === "function"
			? input.passThroughOnException
			: undefined;

	return {
		waitUntil: (promise: Promise<unknown>) => {
			waitUntil.call(input, promise);
		},
		...(passThroughOnException
			? {
					passThroughOnException: () => {
						passThroughOnException.call(input);
					},
				}
			: {}),
		props: "props" in input ? input.props : undefined,
		exports: "exports" in input ? input.exports : undefined,
	};
};

export default parseExecutionContext;
