import type { RoutineEventFacts } from "../../../libs/agent/routine-events.js";
import {
	RequestDocumentsRepository,
	RequestsRepository,
} from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** A request's type and collections, which routine event filters match on. */
const getRequestEventFacts: ServiceFn<
	[{ requestId: number }],
	RoutineEventFacts
> = async (context, data) => {
	const Requests = new RequestsRepository(context.db);
	const RequestDocuments = new RequestDocumentsRepository(context.db);

	const [request, documents] = await Promise.all([
		Requests.selectSingle({
			select: ["type"],
			where: [{ key: "id", operator: "=", value: data.requestId }],
			validation: { enabled: true },
		}),
		RequestDocuments.selectMultiple({
			select: ["collection_key"],
			where: [{ key: "request_id", operator: "=", value: data.requestId }],
			validation: { enabled: true },
		}),
	]);
	if (request.error) return request;
	if (documents.error) return documents;

	return {
		error: undefined,
		data: {
			requestType: request.data.type,
			collections: documents.data.map((document) => document.collection_key),
		},
	};
};

export default getRequestEventFacts;
