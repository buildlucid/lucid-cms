type FixedLengthStreamConstructor = new (
	length: number | bigint,
) => {
	readable: ReadableStream<Uint8Array>;
	writable: WritableStream<Uint8Array>;
};

const getFixedLengthStreamConstructor = () => {
	if (typeof FixedLengthStream === "undefined") {
		return null;
	}

	return FixedLengthStream as FixedLengthStreamConstructor;
};

/**
 * Wraps an incoming request stream in a fixed-length stream when the runtime
 * supports it. This keeps local Cloudflare/R2 development happy by giving the
 * binding a body with a known length instead of a generic streamed body.
 */
export const createFixedLengthStream = (
	body: ReadableStream<Uint8Array>,
	contentLength: number,
) => {
	const FixedLengthStreamConstructor = getFixedLengthStreamConstructor();
	if (!FixedLengthStreamConstructor) {
		return {
			stream: body,
			completed: Promise.resolve(),
		};
	}

	const fixedLengthStream = new FixedLengthStreamConstructor(contentLength);

	return {
		stream: fixedLengthStream.readable,
		completed: body.pipeTo(fixedLengthStream.writable),
	};
};
