import type { RouteSchema } from "../../types/schema.js";
import type {
	LucidRouteDefinition,
	LucidRouteDefinitionInput,
} from "./types.js";

const createRoute = <
	TSchema extends RouteSchema | undefined = RouteSchema | undefined,
>(
	definition: LucidRouteDefinitionInput<TSchema>,
): LucidRouteDefinition<TSchema> => definition;

export default createRoute;
