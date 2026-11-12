/** Lucid's usage for a model request, with token counts estimated from text length. */
export const modelUsage = (props: {
	model: string;
	inputChars: number;
	outputChars: number;
	inputTokens?: number;
	credits: number;
}) => {
	const input = props.inputTokens ?? Math.ceil(props.inputChars / 4);
	const output = Math.ceil(props.outputChars / 4);
	return {
		model: props.model,
		tokens: {
			input: {
				text: input,
				image: 0,
				audio: 0,
				cached: { total: 0, text: 0, image: 0, audio: 0 },
				total: input,
			},
			output: {
				text: output,
				image: 0,
				audio: 0,
				reasoning: 0,
				acceptedPrediction: 0,
				rejectedPrediction: 0,
				total: output,
			},
			total: input + output,
		},
		cost: { creditsCharged: String(props.credits) },
	};
};

/** Lucid's usage for a web search or page read. */
export const webUsage = (props: {
	operation: "search" | "fetch";
	requestId: string;
	credits: number;
}) => ({
	kind: "web",
	operation: props.operation,
	provider: "harness",
	requests: 1,
	model: null,
	tokens: null,
	providerRequestId: props.requestId,
	cost: { creditsCharged: String(props.credits) },
});

/** An error body as Lucid's API sends it, which the CMS reads its key from. */
export const remoteError = (status: number, key: string, message?: string) =>
	Response.json(
		{ status, key, name: "Lucid harness", message: message ?? key },
		{ status },
	);
