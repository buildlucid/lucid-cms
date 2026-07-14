import type { ImageProcessorInstance } from "../types.js";

/**
 * A passthrough image processor that leaves the original stream unchanged.
 *
 * This is used when no image processor is configured or the configured processor cannot be
 * initialized.
 */
const passthroughImageProcessor = (): ImageProcessorInstance => ({
	type: "image-processor",
	key: "passthrough",
	process: async () => ({
		error: undefined,
		data: {
			processed: false,
		},
	}),
});

export default passthroughImageProcessor;
