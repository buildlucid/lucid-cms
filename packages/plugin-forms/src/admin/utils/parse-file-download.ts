/** Reads the file download route's response: the file's temporary URL. */
const parseFileDownload = (response: unknown): { url: string } => {
	if (
		typeof response === "object" &&
		response !== null &&
		"data" in response &&
		typeof response.data === "object" &&
		response.data !== null &&
		"url" in response.data &&
		typeof response.data.url === "string"
	) {
		return { url: response.data.url };
	}

	throw new Error("The file's download URL is missing from the response.");
};

export default parseFileDownload;
