import type { DocumentVersion } from "@types";

export type TimelineCardType =
	| "latest"
	| "revision"
	| "snapshot"
	| "environment";

export type TimelineItem = {
	type: TimelineCardType;
	id: number;
	version: string;
	createdAt: string | null;
	updatedAt: string | null;
	timelineAt: string | null;
	createdBy: number | null;
	promotedFrom: number | null;
	contentId: string | null;
	isReleased: boolean;
	inSyncWithPromotedFrom: boolean;
	promotedFromLatest: boolean;
	bricks?: DocumentVersion["bricks"];
	environmentVersions?: TimelineItem[];
};

export type TimelineGroup = {
	dateLabel: string;
	items: TimelineItem[];
};

export type RetentionInfo = {
	state: "protected" | "retained" | "expiring" | "expired" | "unknown";
	label: string;
	description: string;
	expiresAt?: string;
	daysRemaining?: number;
};
