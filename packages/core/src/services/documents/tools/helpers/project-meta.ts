import type z from "zod";
import { formatPerson } from "../../../../libs/tools/person.js";
import type { CollectionDocumentMeta } from "../../../../types/response.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import getAgentActors from "../../../agent/helpers/get-agent-actors.js";
import getRequestUsers from "../../../requests/helpers/get-request-users.js";
import type { documentMetaSchema } from "../../helpers/project-document.js";

/** Names the people and agents behind a document and its versions, as request tools do. */
const projectMeta: ServiceFn<
	[{ meta: CollectionDocumentMeta }],
	z.output<typeof documentMetaSchema>
> = async (context, data) => {
	const versions = Object.entries(data.meta.versions);
	const [usersRes, agentsRes] = await Promise.all([
		getRequestUsers(context, {
			ids: [
				data.meta.createdBy,
				data.meta.updatedBy,
				...versions.map(([, version]) => version?.createdBy ?? null),
			],
		}),
		getAgentActors(context, {
			runIds: [
				data.meta.createdByRunId,
				data.meta.updatedByRunId,
				...versions.map(([, version]) => version?.createdByRunId),
			],
		}),
	]);
	if (usersRes.error) return usersRes;
	if (agentsRes.error) return agentsRes;

	const person = (id: number | null) => {
		const user = id === null ? undefined : usersRes.data.get(id);
		return user ? formatPerson(user) : null;
	};
	const agent = (runId: string | null) =>
		(runId && agentsRes.data.get(runId)?.name) ?? null;

	return {
		error: undefined,
		data: {
			versionId: data.meta.versionId,
			versions: Object.fromEntries(
				versions.map(([key, version]) => [
					key,
					version && {
						id: version.id,
						contentId: version.contentId,
						createdAt: version.createdAt,
						updatedAt: version.updatedAt,
						createdBy: person(version.createdBy),
						createdByAgent: agent(version.createdByRunId),
					},
				]),
			),
			createdAt: data.meta.createdAt,
			updatedAt: data.meta.updatedAt,
			createdBy: person(data.meta.createdBy),
			createdByAgent: agent(data.meta.createdByRunId),
			updatedBy: person(data.meta.updatedBy),
			updatedByAgent: agent(data.meta.updatedByRunId),
		},
	};
};

export default projectMeta;
