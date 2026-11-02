import type { ServiceFn } from "../../../utils/services/types.js";
import testStorage from "../../media/cli/test-storage.js";
import type { DiagnosticCheckOutcome } from "./types.js";

/** Writes, reads and deletes a temporary file with the media storage adapter. Skipped when none is configured. */
const mediaStorageCheck: ServiceFn<[], DiagnosticCheckOutcome> = async (
	context,
) => {
	if (!context.mediaStorage) {
		return {
			error: undefined,
			data: {
				adapter: null,
				steps: [],
				skipped: context.translate(
					"server:core.media.storage.adapter.not.enabled",
				),
			},
		};
	}

	const tested = await testStorage(context);
	if (tested.error) {
		return {
			error: undefined,
			data: {
				adapter: context.mediaStorage.key,
				steps: [
					{
						name: "write",
						error:
							context.translate(tested.error.message) ??
							context.translate("server:core.errors.default.message"),
					},
				],
			},
		};
	}

	return {
		error: undefined,
		data: { adapter: tested.data.adapter, steps: tested.data.steps },
	};
};

export default mediaStorageCheck;
