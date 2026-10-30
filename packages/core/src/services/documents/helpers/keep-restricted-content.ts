import type CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import getContentAccess from "../../../libs/collection/field-access/get-content-access.js";
import type { BrickInputSchema } from "../../../schemas/collection-bricks.js";
import type { FieldInputSchema } from "../../../schemas/collection-fields.js";
import type { LucidActor } from "../../../types/hono.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import readStoredContent from "../../documents-versions/helpers/read-stored-content.js";
import checkHiddenEmbeddedBricks from "../checks/check-hidden-embedded-bricks.js";
import restoreRestrictedContent from "./restore-restricted-content.js";

/** Restores restricted content before full-payload saves and rejects hidden embedded brick exposure; unrestricted actors and writes without actors, such as hooks and system writes, pass through. */
const keepRestrictedContent: ServiceFn<
	[
		{
			collection: CollectionBuilder;
			actor: LucidActor | undefined;
			documentId: number;
			/** The replaced version, omitted for new documents so restricted fields receive defaults. */
			versionId: number | undefined;
			bricks: BrickInputSchema[] | undefined;
			fields: FieldInputSchema[] | undefined;
		},
	],
	{
		bricks: BrickInputSchema[] | undefined;
		fields: FieldInputSchema[] | undefined;
	}
> = async (context, data) => {
	const access = getContentAccess(data.collection, data.actor);
	if (!access.restricted) {
		return {
			error: undefined,
			data: { bricks: data.bricks, fields: data.fields },
		};
	}

	const storedRes =
		data.versionId === undefined
			? undefined
			: await readStoredContent(context, {
					collection: data.collection,
					documentId: data.documentId,
					versionId: data.versionId,
				});
	if (storedRes?.error) return storedRes;

	const stored = storedRes?.data ?? { fields: [], bricks: [] };
	const restored = restoreRestrictedContent(
		access,
		{ fields: data.fields ?? [], bricks: data.bricks ?? [] },
		stored,
	);

	const hiddenRes = checkHiddenEmbeddedBricks(access, stored, restored);
	if (hiddenRes.error) return hiddenRes;

	return { error: undefined, data: restored };
};

export default keepRestrictedContent;
