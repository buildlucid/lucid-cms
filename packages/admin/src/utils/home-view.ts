import { useAdminConfig } from "@/hooks/useAdminConfig/useAdminConfig";
import userPreferencesStore, {
	type HomeView,
} from "@/store/userPreferencesStore/userPreferencesStore";
import { getAgentAccess } from "@/utils/agent-access";

/**
 * Whether Home can open on the chat box. Needs `admin.agentHomescreen` left on in
 * lucid.config and an agent the user can chat with.
 */
export const canUseAskView = () =>
	useAdminConfig().agentHomescreen && getAgentAccess().chat.length > 0;

/**
 * The view Home opens on. Users who can chat start on Ask until they pick,
 * everyone else always gets Overview. Reactive inside a memo or effect.
 */
export const getHomeView = (): HomeView =>
	canUseAskView() ? (userPreferencesStore.getHomeView() ?? "ask") : "overview";

/** Where a new chat starts. Home replaces the agent page while it shows the chat box. */
export const getNewChatHref = () =>
	getHomeView() === "ask" ? "/lucid" : "/lucid/agent";
