import { getTableNames } from "../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import { copy } from "../../libs/i18n/index.js";
import { DocumentsRepository } from "../../libs/repositories/index.js";
import {
	generateKeyBetween,
	isFractionalOrderKey,
} from "../../utils/helpers/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { documentServices } from "../index.js";
import invalidateClientDocumentCache from "./helpers/invalidate-client-cache.js";

/** Moves a document between two manual-order neighbours. */
const updateOrder: ServiceFn<
	[
		{
			collectionKey: string;
			documentId: number;
			/** Previous neighbour, or null when moving to the start. */
			previousDocumentId: number | null;
			/** Next neighbour, or null when moving to the end. */
			nextDocumentId: number | null;
		},
	],
	undefined
> = async (context, data) => {
	const Document = new DocumentsRepository(
		context.db.client,
		context.config.db,
	);

	// ----------------------------------------------
	// Checks

	//* check collection
	const collectionRes = await documentServices.checks.checkCollection(context, {
		key: data.collectionKey,
	});
	if (collectionRes.error) return collectionRes;

	if (collectionRes.data.getData.orderable !== true) {
		return {
			error: {
				type: "basic",
				name: copy("server:core.documents.order.not.orderable.name"),
				message: copy("server:core.documents.order.not.orderable.message"),
				status: 400,
			},
			data: undefined,
		};
	}

	//* validate neighbour ids
	if (
		data.previousDocumentId === data.documentId ||
		data.nextDocumentId === data.documentId ||
		(data.previousDocumentId !== null &&
			data.previousDocumentId === data.nextDocumentId)
	) {
		return {
			error: {
				type: "basic",
				name: copy("server:core.documents.order.invalid.name"),
				message: copy("server:core.documents.order.invalid.message"),
				status: 400,
			},
			data: undefined,
		};
	}

	const tableNamesRes = await getTableNames(context, data.collectionKey);
	if (tableNamesRes.error) return tableNamesRes;

	//* check moved and neighbour documents
	const documentAccessRes = await documentServices.checks.checkDocumentAccess(
		context,
		{
			collectionKey: data.collectionKey,
			ids: [
				data.documentId,
				...(data.previousDocumentId !== null ? [data.previousDocumentId] : []),
				...(data.nextDocumentId !== null ? [data.nextDocumentId] : []),
			],
		},
	);
	if (documentAccessRes.error) return documentAccessRes;

	// ----------------------------------------------
	// Compute order bounds
	const neighbourIds = [
		...(data.previousDocumentId !== null ? [data.previousDocumentId] : []),
		...(data.nextDocumentId !== null ? [data.nextDocumentId] : []),
	];

	const neighbourKeysRes = await Document.selectOrderKeysByIds(
		{
			ids: neighbourIds,
		},
		{
			tableName: tableNamesRes.data.document,
		},
	);
	if (neighbourKeysRes.error) return neighbourKeysRes;

	const orderKeyForId = (id: number | null): string | null => {
		if (id === null) return null;
		const key = neighbourKeysRes.data?.find((row) => row.id === id)?.order;
		return isFractionalOrderKey(key) ? key : null;
	};

	const previousKey = orderKeyForId(data.previousDocumentId);
	const nextKey = orderKeyForId(data.nextDocumentId);

	//* append when stored bounds cannot be split
	const order = generateKeyBetween(
		previousKey,
		previousKey !== null && nextKey !== null && previousKey >= nextKey
			? null
			: nextKey,
	);

	// ----------------------------------------------
	// Update document row
	const updateRes = await Document.updateSingle(
		{
			where: [
				{
					key: "id",
					operator: "=",
					value: data.documentId,
				},
			],
			data: {
				order,
			},
			returning: ["id"],
			validation: {
				enabled: true,
			},
		},
		{
			tableName: tableNamesRes.data.document,
		},
	);
	if (updateRes.error) return updateRes;

	await invalidateClientDocumentCache(context, data.collectionKey);

	return {
		error: undefined,
		data: undefined,
	};
};

export default updateOrder;
