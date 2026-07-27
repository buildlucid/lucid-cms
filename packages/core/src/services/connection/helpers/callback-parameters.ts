export type ConnectionCallbackParameters = {
	state: string;
	issuer?: string;
	code?: string;
	error?: string;
	valid: boolean;
};

/**
 * Parses an OAuth callback without collapsing duplicate parameters.
 * Unknown singleton response parameters are ignored as required by OAuth.
 */
export const parseConnectionCallbackParameters = (
	url: URL,
): ConnectionCallbackParameters => {
	const parameterNames = [...url.searchParams.keys()];
	const hasDuplicates = [...new Set(parameterNames)].some(
		(name) => url.searchParams.getAll(name).length !== 1,
	);
	const states = url.searchParams.getAll("state");
	const issuers = url.searchParams.getAll("iss");
	const codes = url.searchParams.getAll("code");
	const errors = url.searchParams.getAll("error");

	return {
		state: states[0] ?? "",
		issuer: issuers[0],
		code: codes[0],
		error: errors[0],
		valid:
			!hasDuplicates &&
			states.length === 1 &&
			issuers.length === 1 &&
			codes.length <= 1 &&
			errors.length <= 1 &&
			(codes.length === 1) !== (errors.length === 1),
	};
};
