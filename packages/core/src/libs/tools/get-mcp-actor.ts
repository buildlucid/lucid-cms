import type { ToolkitActor } from "../permission/toolkit-actor.js";
import type { McpToolAuthority } from "./types.js";

/** Reads as the connection's user with their live permissions, or as the system. */
const getMcpActor = (authority: McpToolAuthority): ToolkitActor =>
	authority.principal.type === "user"
		? { type: "user", userId: authority.principal.userId }
		: { type: "system" };

export default getMcpActor;
