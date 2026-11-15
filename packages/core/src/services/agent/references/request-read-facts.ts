import {
	RequestDocumentsRepository,
	RequestReviewersRepository,
	RequestsRepository,
} from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import type { RequestReadFacts } from "../../requests/helpers/can-read-request.js";

/** What `canReadRequest` needs for each request, keyed by ID. Missing requests are left out. */
const requestReadFacts: ServiceFn<
	[{ requestIds: number[] }],
	Map<number, RequestReadFacts>
> = async (context, input) => {
	if (input.requestIds.length === 0) {
		return { error: undefined, data: new Map() };
	}

	const Requests = new RequestsRepository(context.db);
	const RequestDocuments = new RequestDocumentsRepository(context.db);
	const RequestReviewers = new RequestReviewersRepository(context.db);

	const [requestsRes, documentsRes, reviewersRes] = await Promise.all([
		Requests.selectMultiple({
			select: ["id", "type", "created_by"],
			where: [{ key: "id", operator: "in", value: input.requestIds }],
			validation: { enabled: true },
		}),
		RequestDocuments.selectMultiple({
			select: ["request_id", "collection_key"],
			where: [{ key: "request_id", operator: "in", value: input.requestIds }],
			validation: { enabled: true },
		}),
		RequestReviewers.selectMultiple({
			select: ["request_id", "user_id"],
			where: [{ key: "request_id", operator: "in", value: input.requestIds }],
			validation: { enabled: true },
		}),
	]);
	if (requestsRes.error) return requestsRes;
	if (documentsRes.error) return documentsRes;
	if (reviewersRes.error) return reviewersRes;

	const documents = Map.groupBy(
		documentsRes.data,
		(document) => document.request_id,
	);
	const reviewers = Map.groupBy(
		reviewersRes.data,
		(reviewer) => reviewer.request_id,
	);

	return {
		error: undefined,
		data: new Map(
			requestsRes.data.map((request) => [
				request.id,
				{
					type: request.type,
					created_by: request.created_by,
					documents: documents.get(request.id) ?? [],
					reviewers: reviewers.get(request.id) ?? [],
				},
			]),
		),
	};
};

export default requestReadFacts;
