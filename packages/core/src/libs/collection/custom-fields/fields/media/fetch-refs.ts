import type {
	FieldRefFetchInput,
	FieldRefFetchOutput,
} from "../../../../../services/documents-bricks/helpers/fetch-ref-data.js";
import type { ServiceFn } from "../../../../../utils/services/types.js";
import type { MediaPropsT } from "../../../../formatters/media.js";
import { MediaRepository } from "../../../../repositories/index.js";

const fetchMediaRefs: ServiceFn<
	[FieldRefFetchInput],
	FieldRefFetchOutput
> = async (context, data) => {
	const Media = new MediaRepository(context.db.client, context.config.db);
	const ids = Array.from(
		new Set(
			data.relations.flatMap((relation) =>
				Array.from(relation.values).filter(
					(value): value is number => typeof value === "number",
				),
			),
		),
	);

	if (ids.length === 0) {
		return {
			data: {
				rows: [] satisfies MediaPropsT[],
			},
			error: undefined,
		};
	}

	const mediaRes = await Media.selectMultipleByIds({
		ids,
		validation: {
			enabled: true,
		},
	});
	if (mediaRes.error) return mediaRes;

	return {
		error: undefined,
		data: {
			rows: mediaRes.data,
		},
	};
};

export default fetchMediaRefs;
