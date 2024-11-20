const chooseAcceptHeaderFormat = (
	accept: string | undefined,
	queryFormat?: "avif" | "webp" | "jpeg" | "png" | undefined,
) => {
	if (queryFormat) return queryFormat;

	if (accept) {
		if (accept.includes("image/webp")) return "webp";
		if (accept.includes("image/avif")) return "avif";
	}

	return undefined;
};

export default chooseAcceptHeaderFormat;
