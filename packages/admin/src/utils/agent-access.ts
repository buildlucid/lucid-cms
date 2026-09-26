import type { Agent } from "@types";
import siteStore from "@/store/siteStore/siteStore";
import userStore from "@/store/userStore/userStore";

/** The agents the current user can use or manage. Reactive when read inside a memo or effect. */
export const getAgentAccess = () => {
	const agents = siteStore.get.ai.enabled ? siteStore.get.ai.agents : [];
	const can = (agent: Agent, level: "use" | "manage") =>
		userStore.get.hasPermission([`agents:${agent.key}:${level}`]).all;

	return {
		all: agents.filter((agent) => can(agent, "use") || can(agent, "manage")),
		use: agents.filter((agent) => can(agent, "use")),
		manage: agents.filter((agent) => can(agent, "manage")),
	};
};

/** An agent's display name, falling back to its key once it is removed from config. */
export const getAgentName = (key: string) =>
	siteStore.get.ai.agents.find((agent) => agent.key === key)?.name ?? key;

/** The agent cannot run until the CMS is connected to Lucid. Saved chats still load. */
export const isAgentDisconnected = () => {
	const connection = siteStore.get.connection;
	return connection !== null && connection.status !== "connected";
};
