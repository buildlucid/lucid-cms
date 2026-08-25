import type { DocumentRef, Refs, UserRef } from "@types";
import { isObjectRecord } from "@/utils/type-guards";

const normalizeRefs = <TRef>(refs: TRef | TRef[]): TRef[] =>
	Array.isArray(refs) ? refs : [refs];

/** Returns a new list with matching refs replaced and unseen refs appended. */
export const upsertRefs = <TRef>(
	current: TRef[] | undefined,
	next: TRef | TRef[],
	isSameRef: (existing: TRef, next: TRef) => boolean,
): TRef[] => {
	const refs = [...(current ?? [])];

	for (const nextRef of normalizeRefs(next)) {
		const existingIndex = refs.findIndex((existing) =>
			isSameRef(existing, nextRef),
		);

		if (existingIndex === -1) {
			refs.push(nextRef);
		} else {
			refs[existingIndex] = nextRef;
		}
	}

	return refs;
};

export const isDocumentRef = (value: unknown): value is DocumentRef => {
	return (
		isObjectRecord(value) &&
		typeof value.id === "number" &&
		typeof value.collectionKey === "string" &&
		"fields" in value
	);
};

export const findDocumentUserRef = (
	refs: Refs | undefined,
	userId: number | null | undefined,
): NonNullable<UserRef> | undefined => {
	if (typeof userId !== "number") return undefined;

	return refs?.users?.find((user) => user.id === userId);
};
