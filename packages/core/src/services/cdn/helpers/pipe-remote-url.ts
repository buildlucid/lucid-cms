const pipeRemoteUrl = async (data: {
	url: string;
	redirections?: number;
}): Promise<{
	buffer: Buffer;
	contentType: string | undefined;
}> => {
	const redirections = data?.redirections || 0;

	if (redirections >= 5) {
		throw new Error("Too many redirections");
	}

	try {
		const response = await fetch(data.url, {
			redirect: redirections === 0 ? "follow" : "manual", // Let fetch handle redirects automatically on first try
		});

		// Handle manual redirects if needed (though fetch usually handles this)
		if (response.status >= 300 && response.status < 400) {
			const location = response.headers.get("location");
			if (location) {
				return pipeRemoteUrl({
					url: location,
					redirections: redirections + 1,
				});
			}
		}

		if (!response.ok) {
			throw new Error(`Request failed. Status code: ${response.status}`);
		}

		// Verify content type is an image
		const contentType = response.headers.get("content-type");
		if (contentType && !contentType.includes("image")) {
			throw new Error("Content type is not an image");
		}

		// Get the response as arrayBuffer and convert to Buffer
		const arrayBuffer = await response.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		return {
			buffer,
			contentType: contentType || undefined,
		};
	} catch (error) {
		throw new Error(
			`Error fetching the fallback image: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
};

export default pipeRemoteUrl;
