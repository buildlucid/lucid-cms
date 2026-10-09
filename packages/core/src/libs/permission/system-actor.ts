import type { LucidSystemActor } from "../../types/hono.js";

/** Acts as the system in services that take a `LucidActor`, eg. for routines defined in code. */
const systemActor: LucidSystemActor = {
	id: null,
	superAdmin: true,
	permissions: undefined,
};

export default systemActor;
