/** Reads the export route's response: the CSV text and the name to save it under. */
const parseExport = (response: unknown): { fileName: string; csv: string } => {
	if (
		typeof response === "object" &&
		response !== null &&
		"data" in response &&
		typeof response.data === "object" &&
		response.data !== null &&
		"fileName" in response.data &&
		typeof response.data.fileName === "string" &&
		"csv" in response.data &&
		typeof response.data.csv === "string"
	) {
		return { fileName: response.data.fileName, csv: response.data.csv };
	}

	throw new Error("The export is missing from the response.");
};

export default parseExport;
