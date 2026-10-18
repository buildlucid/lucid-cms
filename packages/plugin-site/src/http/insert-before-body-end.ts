const BODY_END = /<\/body\s*>/i;
// Retain a tail to catch closing tags split across chunks.
const HELD_LENGTH = 16;

/** Calls html() when </body> arrives, or at EOF if absent. */
const insertBeforeBodyEnd = (
	stream: ReadableStream<Uint8Array>,
	html: () => string,
): ReadableStream<Uint8Array> => {
	const decoder = new TextDecoder();
	const encoder = new TextEncoder();
	let held = "";
	let inserted = false;

	return stream.pipeThrough(
		new TransformStream<Uint8Array, Uint8Array>({
			transform(chunk, controller) {
				const text = decoder.decode(chunk, { stream: true });
				if (inserted) {
					controller.enqueue(encoder.encode(text));
					return;
				}

				held += text;
				const match = BODY_END.exec(held);
				if (match) {
					controller.enqueue(
						encoder.encode(
							held.slice(0, match.index) + html() + held.slice(match.index),
						),
					);
					held = "";
					inserted = true;
					return;
				}
				if (held.length > HELD_LENGTH) {
					controller.enqueue(encoder.encode(held.slice(0, -HELD_LENGTH)));
					held = held.slice(-HELD_LENGTH);
				}
			},
			flush(controller) {
				const rest = held + decoder.decode();
				controller.enqueue(encoder.encode(inserted ? rest : rest + html()));
			},
		}),
	);
};

export default insertBeforeBodyEnd;
