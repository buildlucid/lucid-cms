import type { ToolkitActor } from "../../../../libs/toolkit/types.js";
import type { McpToolAuthority } from "../../../../libs/tools/types.js";

/** Reads as the connection's user with their live permissions, or as the system. */
const getMcpActor = (authority: McpToolAuthority): ToolkitActor =>
	authority.principal.type === "user"
		? { kind: "user", userId: authority.principal.userId }
		: { kind: "system" };

export default getMcpActor;
