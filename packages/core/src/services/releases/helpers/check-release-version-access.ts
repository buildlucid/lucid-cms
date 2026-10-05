import { copy } from "../../../libs/i18n/index.js";
import { ReleasesRepository } from "../../../libs/repositories/index.js";
import type { LucidUser } from "../../../types/hono.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import canEditDocument from "./can-edit-document.js";
import getReleaseAccess from "./get-release-access.js";

/**
 * Release proposals and snapshots belong to one release. Reading them needs
 * access to that release, and editing a proposal needs edit access to its
 * document while the release is open.
 */
const checkReleaseVersionAccess: ServiceFn<
	[
		{
			collectionKey: string;
			documentId: number;
			versionId: number;
			user?: LucidUser;
			edit?: boolean;
		},
	],
	undefined
> = async (context, data) => {
	const Releases = new ReleasesRepository(context.db);

	if (!data.user) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.documents.version.not.found.message"),
				status: 404,
			},
			data: undefined,
		};
	}

	const ownerRes = await Releases.selectVersionOwner({
		collectionKey: data.collectionKey,
		documentId: data.documentId,
		versionId: data.versionId,
	});
	if (ownerRes.error) return ownerRes;

	const owner = ownerRes.data;
	if (
		!owner ||
		!getReleaseAccess(context, { release: owner, user: data.user }).read
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.documents.version.not.found.message"),
				status: 404,
			},
			data: undefined,
		};
	}

	if (!data.edit) return { error: undefined, data: undefined };

	if (
		owner.source !== "latest" ||
		owner.source_version_id !== data.versionId ||
		!canEditDocument({
			release: owner,
			collectionKey: data.collectionKey,
			user: data.user,
		})
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.releases.proposal.locked"),
				status: 403,
			},
			data: undefined,
		};
	}

	return { error: undefined, data: undefined };
};

export default checkReleaseVersionAccess;
