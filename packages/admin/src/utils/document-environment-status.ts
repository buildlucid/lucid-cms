import type {
	DocumentEnvironmentStatus,
	InternalCollectionDocument,
} from "@types";
import T from "@/translations";

/** Resolves whether an environment contains the latest saved document content. */
export const getDocumentEnvironmentStatus = (props: {
	versions?: InternalCollectionDocument["versions"];
	environmentKey: string;
	latestContentId?: string;
}): DocumentEnvironmentStatus => {
	const environmentVersion = props.versions?.[props.environmentKey];
	if (!environmentVersion) return "unreleased";

	const latestContentId =
		props.latestContentId ?? props.versions?.latest?.contentId;
	if (
		latestContentId !== undefined &&
		environmentVersion.contentId === latestContentId
	) {
		return "in-sync";
	}

	return "out-of-sync";
};

export const getDocumentEnvironmentStatusLabel = (
	status: DocumentEnvironmentStatus,
): string => {
	switch (status) {
		case "in-sync":
			return T()("common.status.in.sync");
		case "out-of-sync":
			return T()("common.status.out.of.sync");
		case "unreleased":
			return T()("common.status.unreleased");
	}
};
