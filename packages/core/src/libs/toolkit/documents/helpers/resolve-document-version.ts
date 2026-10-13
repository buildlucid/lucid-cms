import type resolveDocumentActor from "../../../../services/documents/helpers/resolve-document-actor.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import systemActor from "../../../permission/system-actor.js";
import type { ToolkitActor } from "../../../permission/toolkit-actor.js";

/**
 * Resolves actor access and the proposal selected by `requestId`, falling back to latest.
 * @remarks Proposal reads require read access here; saving separately checks request edit access.
 */
const resolveDocumentVersion: ServiceFn<
	[
		{
			actor: ToolkitActor;
			collectionKey: string;
			id: number;
			requestId?: number;
			action: "read" | "update";
		},
	],
	{
		actor: NonNullable<
			Awaited<ReturnType<typeof resolveDocumentActor>>["data"]
		>;
		/** Request proposal version ID, undefined when using latest. */
		versionId?: number;
	}
> = async (context, input) => {
	const [
		{ default: resolveDocumentActor },
		{ default: resolveProposalVersion },
	] = await Promise.all([
		import("../../../../services/documents/helpers/resolve-document-actor.js"),
		import(
			"../../../../services/documents/helpers/resolve-proposal-version.js"
		),
	]);

	const actor = await resolveDocumentActor(context, {
		actor: input.actor,
		collectionKey: input.collectionKey,
		action: input.requestId === undefined ? input.action : "read",
	});
	if (actor.error) return actor;
	if (input.requestId === undefined) {
		return { error: undefined, data: { actor: actor.data } };
	}

	const versionRes = await resolveProposalVersion(context, {
		requestId: input.requestId,
		collectionKey: input.collectionKey,
		documentId: input.id,
		user: actor.data.authUser ?? systemActor,
	});
	if (versionRes.error) return versionRes;

	return {
		error: undefined,
		data: { actor: actor.data, versionId: versionRes.data },
	};
};

export default resolveDocumentVersion;
