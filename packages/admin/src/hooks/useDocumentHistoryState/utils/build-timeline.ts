import type { DocumentVersion, InternalCollectionDocument } from "@types";
import type { TimelineGroup, TimelineItem } from "../types";
import { getDateGroupKey } from "./date-group";

export const buildTimeline = (props: {
	documentData: InternalCollectionDocument | undefined;
	revisions: DocumentVersion[];
}): TimelineGroup[] => {
	const { documentData, revisions } = props;
	const allItems: TimelineItem[] = [];
	let latestItem: TimelineItem | undefined;

	const isInSyncWithPromotedFrom = (
		item:
			| DocumentVersion
			| NonNullable<InternalCollectionDocument["versions"]["latest"]>,
	): boolean => {
		const promotedFromItem = allItems.find((i) => i.id === item.promotedFrom);
		if (!promotedFromItem) return false;
		return promotedFromItem.contentId === item.contentId;
	};

	//* add latest version
	if (documentData?.versions?.latest) {
		const latest = documentData.versions.latest;
		latestItem = {
			type: "latest",
			id: latest.id,
			version: "latest",
			createdAt: latest.createdAt,
			updatedAt: latest.updatedAt,
			timelineAt: latest.updatedAt ?? latest.createdAt,
			createdBy: latest.createdBy,
			promotedFrom: latest.promotedFrom,
			contentId: latest.contentId,
			isReleased: true,
			promotedFromLatest: true,
			inSyncWithPromotedFrom: isInSyncWithPromotedFrom(latest),
		};
		allItems.push(latestItem);
	}

	//* add revisions and visible snapshots
	for (const revision of revisions) {
		const versionType =
			revision.versionType === "snapshot" ? "snapshot" : "revision";

		allItems.push({
			type: versionType,
			version: versionType,
			id: revision.id,
			createdAt: revision.createdAt,
			updatedAt: null,
			timelineAt: revision.createdAt,
			createdBy: revision.createdBy,
			promotedFrom: revision.promotedFrom,
			contentId: revision.contentId,
			bricks: revision.bricks,
			isReleased: false,
			promotedFromLatest:
				documentData?.versions?.latest?.id === revision.promotedFrom,
			inSyncWithPromotedFrom: isInSyncWithPromotedFrom(revision),
		});
	}

	//* collect environment versions
	const environmentVersions: TimelineItem[] = [];
	if (documentData?.versions) {
		let unreleasedEnvCounter = 0;
		for (const [key, version] of Object.entries(documentData.versions)) {
			if (key === "latest") continue;

			if (version) {
				environmentVersions.push({
					type: "environment",
					id: version.id,
					version: key,
					createdAt: version.createdAt,
					updatedAt: version.updatedAt,
					timelineAt: version.createdAt,
					createdBy: version.createdBy,
					promotedFrom: version.promotedFrom,
					contentId: version.contentId,
					isReleased: true,
					promotedFromLatest:
						documentData?.versions?.latest?.id === version.promotedFrom,
					inSyncWithPromotedFrom: isInSyncWithPromotedFrom(version),
				});
			}

			if (version === null) {
				if (latestItem) {
					if (!latestItem.environmentVersions)
						latestItem.environmentVersions = [];
					latestItem.environmentVersions.push({
						type: "environment",
						id: -1 * (1000 + unreleasedEnvCounter++),
						version: key,
						createdAt: null,
						updatedAt: null,
						timelineAt: null,
						createdBy: null,
						promotedFrom: null,
						contentId: null,
						isReleased: false,
						promotedFromLatest: false,
						inSyncWithPromotedFrom: false,
					});
				}
			}
		}
	}

	//* link environment versions to their source
	const contentIdMap = new Map<string, TimelineItem>();
	const idMap = new Map<number, TimelineItem>();

	for (const item of allItems) {
		if (item.contentId) contentIdMap.set(item.contentId, item);
		idMap.set(item.id, item);
	}

	//* attach environment versions to their sources
	for (const envVersion of environmentVersions) {
		let sourceItem: TimelineItem | undefined;

		if (envVersion.promotedFrom) {
			sourceItem = idMap.get(envVersion.promotedFrom);
		}

		if (!sourceItem && envVersion.contentId) {
			sourceItem = contentIdMap.get(envVersion.contentId);
		}

		if (sourceItem) {
			envVersion.inSyncWithPromotedFrom =
				sourceItem.contentId === envVersion.contentId;
			envVersion.promotedFromLatest = sourceItem.type === "latest";
			if (!sourceItem.environmentVersions) {
				sourceItem.environmentVersions = [];
			}
			sourceItem.environmentVersions.push(envVersion);
		} else {
			allItems.push(envVersion);
		}
	}

	//* ensure unreleased env cards are always last within environmentVersions
	for (const item of allItems) {
		if (!item.environmentVersions || item.environmentVersions.length === 0)
			continue;

		const decorated = item.environmentVersions.map((v, idx) => ({ v, idx }));
		decorated.sort((a, b) => {
			const aIsUnreleased = a.v.type === "environment" && !a.v.isReleased;
			const bIsUnreleased = b.v.type === "environment" && !b.v.isReleased;

			if (aIsUnreleased !== bIsUnreleased) {
				return aIsUnreleased ? 1 : -1;
			}
			return a.idx - b.idx;
		});

		item.environmentVersions = decorated.map((d) => d.v);
	}

	//* sort all items by their effective timeline date
	allItems.sort((a, b) => {
		if (!a.timelineAt) return 1;
		if (!b.timelineAt) return -1;
		return new Date(b.timelineAt).getTime() - new Date(a.timelineAt).getTime();
	});

	//* group by date
	const groups: Map<string, TimelineItem[]> = new Map();

	for (const item of allItems) {
		const dateKey = getDateGroupKey(item.timelineAt);
		const existing = groups.get(dateKey) || [];
		groups.set(dateKey, [...existing, item]);
	}

	return Array.from(groups.entries()).map(([dateLabel, items]) => ({
		dateLabel,
		items,
	}));
};
