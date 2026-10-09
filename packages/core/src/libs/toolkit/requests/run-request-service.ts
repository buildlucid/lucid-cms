import type { LucidActor, LucidUser } from "../../../types/hono.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import type { ToolkitActor } from "../types.js";

/** A user actor always resolves to that person, so services that need a person can require one. */
type ResolvedActor<A extends ToolkitActor> = A extends { kind: "user" }
	? LucidUser
	: LucidActor;

/** Runs a request service with the actor's current permissions, wrapping writes in a transaction or reusing the caller's transaction. */
const runRequestService = async <R, A extends ToolkitActor>(
	context: ServiceContext,
	props: {
		actor: A;
		transaction: boolean;
		run: (
			context: ServiceContext,
			user: ResolvedActor<A>,
		) => ServiceResponse<R>;
	},
): ServiceResponse<R> => {
	const [{ default: resolveActorUser }, { default: serviceWrapper }] =
		await Promise.all([
			import("../../../services/users/helpers/resolve-actor-user.js"),
			import("../../../utils/services/service-wrapper.js"),
		]);

	return serviceWrapper(
		async (context: ServiceContext): ServiceResponse<R> => {
			const userRes = await resolveActorUser(context, { actor: props.actor });
			if (userRes.error) return userRes;

			//* resolveActorUser only returns the system actor for system actors
			return props.run(context, userRes.data as ResolvedActor<A>);
		},
		{ transaction: props.transaction },
	)(context);
};

export default runRequestService;
