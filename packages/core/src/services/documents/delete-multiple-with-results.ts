import { copy } from "../../libs/i18n/index.js";
import type { LucidErrorData } from "../../types/errors.js";
import type { ServiceFn } from "../../utils/services/types.js";
import deleteSingle from "./delete-single.js";

/** Deletes each distinct ID independently and retains successful outcomes when another deletion fails. */
const deleteMultipleWithResults: ServiceFn<
	[
		{
			collectionKey: string;
			ids: number[];
			userId: number | null;
			hard: boolean;
		},
	],
	Array<
		{ id: number } & (
			| { status: "deleted" }
			| { status: "failed"; error: LucidErrorData }
		)
	>
> = async (context, data) => {
	const results: NonNullable<
		Awaited<ReturnType<typeof deleteMultipleWithResults>>["data"]
	> = [];

	for (const id of new Set(data.ids)) {
		try {
			const result = await deleteSingle(context, {
				collectionKey: data.collectionKey,
				userId: data.userId,
				hard: data.hard,
				id,
			});
			results.push(
				result.error
					? { id, status: "failed", error: result.error }
					: { id, status: "deleted" },
			);
		} catch (error) {
			results.push({
				id,
				status: "failed",
				error: {
					status: 500,
					message: copy("server:core.documents.authoring.delete.failed"),
					cause: error,
				},
			});
		}
	}

	return { error: undefined, data: results };
};

export default deleteMultipleWithResults;
