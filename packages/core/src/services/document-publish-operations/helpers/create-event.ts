import type CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import type {
	DocumentPublishOperationEventType,
	LucidDocumentPublishOperationEvents,
	LucidDocumentPublishOperations,
	Select,
} from "../../../libs/db/types.js";
import executeHooks from "../../../libs/hooks/execute-hooks.js";
import { DocumentPublishOperationEventsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import { collectionServices } from "../../index.js";

type PublishOperationEventData = {
	operation: Pick<
		Select<LucidDocumentPublishOperations>,
		"id" | "collection_key" | "document_id" | "target"
	>;
	collectionInstance?: CollectionBuilder;
	event: {
		type: DocumentPublishOperationEventType;
		userId?: number | null;
		comment?: string | null;
		metadata?: Record<string, unknown>;
	};
};

const createEvent: ServiceFn<
	[PublishOperationEventData],
	Pick<
		Select<LucidDocumentPublishOperationEvents>,
		| "id"
		| "operation_id"
		| "event_type"
		| "user_id"
		| "comment"
		| "metadata"
		| "created_at"
	>
> = async (context, data) => {
	const Events = new DocumentPublishOperationEventsRepository(
		context.db.client,
		context.config.db,
	);

	const eventRes = await Events.createSingle({
		data: {
			operation_id: data.operation.id,
			event_type: data.event.type,
			user_id: data.event.userId ?? null,
			comment: data.event.comment ?? null,
			metadata: data.event.metadata ?? {},
		},
		returning: [
			"id",
			"operation_id",
			"event_type",
			"user_id",
			"comment",
			"metadata",
			"created_at",
		],
		validation: {
			enabled: true,
		},
	});
	if (eventRes.error) return eventRes;

	const collectionRes =
		data.collectionInstance !== undefined
			? { error: undefined, data: data.collectionInstance }
			: collectionServices.getSingleInstance(context, {
					key: data.operation.collection_key,
				});
	if (collectionRes.error) return collectionRes;

	const hookRes = await executeHooks(
		context,
		{
			service: "publishOperations",
			event: "afterEvent",
			config: context.config,
			collectionInstance: collectionRes.data,
		},
		{
			meta: {
				collection: collectionRes.data,
				collectionKey: data.operation.collection_key,
			},
			data: {
				operationId: data.operation.id,
				collectionKey: data.operation.collection_key,
				documentId: data.operation.document_id,
				target: data.operation.target,
				event: {
					id: eventRes.data.id,
					type: eventRes.data.event_type,
					userId: eventRes.data.user_id,
					comment: eventRes.data.comment,
					metadata: eventRes.data.metadata,
					createdAt: eventRes.data.created_at,
				},
			},
		},
	);
	if (hookRes.error) return hookRes;

	return eventRes;
};

export default createEvent;
