/** Reads the markup route's response: the form's HTML. */
const parseMarkup = (response: unknown): { html: string } => {
	if (
		typeof response === "object" &&
		response !== null &&
		"data" in response &&
		typeof response.data === "object" &&
		response.data !== null &&
		"html" in response.data &&
		typeof response.data.html === "string"
	) {
		return { html: response.data.html };
	}

	throw new Error("The form's markup is missing from the response.");
};

export default parseMarkup;
