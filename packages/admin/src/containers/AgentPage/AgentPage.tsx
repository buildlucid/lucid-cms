import { useLocation, useNavigate } from "@solidjs/router";
import {
	type Component,
	createMemo,
	createSignal,
	onMount,
	Show,
} from "solid-js";
import AgentComposer, {
	type AgentComposerHandle,
} from "@/components/AgentComposer/AgentComposer";
import Alert from "@/components/Alert/Alert";
import PageLayout from "@/components/PageLayout/PageLayout";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import { getAgentAccess, isAgentDisconnected } from "@/utils/agent-access";
import AgentPicker from "./parts/AgentPicker";

/**
 * The agent's home: a greeting and a chat box that starts a new chat. Sending
 * opens the chat straight away and the chat page saves it, so there is no wait
 * here.
 */
const AgentPage: Component = () => {
	// ----------------------------------------
	// State & Hooks
	//* a chat that could not be saved sends its message back here
	const location = useLocation<{ message?: string }>();
	const navigate = useNavigate();
	const returned = location.state?.message;
	const [agentKey, setAgentKey] = createSignal<string>();

	// ----------------------------------------
	// Memos
	const agents = createMemo(() => getAgentAccess().use);
	const agent = createMemo(
		() => agents().find((agent) => agent.key === agentKey()) ?? agents()[0],
	);
	const name = createMemo(() => {
		const user = userStore.get.user;
		return user?.firstName || user?.username;
	});

	// ----------------------------------------
	// Functions
	const start = (text: string) => {
		const selected = agent();
		if (!selected) return false;
		navigate(`/lucid/agent/chats/${crypto.randomUUID()}`, {
			state: { message: text, agentKey: selected.key },
		});
		return true;
	};

	// ----------------------------------------
	// Effects
	onMount(() => {
		//* loaded ahead, so opening a chat does not wait on its code
		void import("@/containers/AgentConversationPage/AgentConversationPage");
		if (returned) navigate(location.pathname, { replace: true, state: {} });
	});

	// ----------------------------------------
	// Render
	return (
		<PageLayout.Root>
			<Show when={isAgentDisconnected()}>
				<Alert variant="warning" appearance="bar">
					{T()("agent.connection.required")}
				</Alert>
			</Show>
			<PageLayout.Body padding="md" class="blur-background justify-center">
				<Show when={agent()}>
					{(current) => (
						<section class="mx-auto flex w-full max-w-3xl flex-col gap-8 pb-[10vh]">
							<div class="flex flex-col items-center gap-1.5 text-center">
								<h2 class="text-2xl font-medium text-title">
									{name()
										? T()("agent.home.greeting", { name: name() })
										: T()("agent.home.greeting.anonymous")}
								</h2>
								<p class="text-base text-body">{T()("agent.home.title")}</p>
							</div>
							<AgentComposer
								ref={(handle: AgentComposerHandle) => {
									if (returned) handle.insert(returned);
								}}
								size="lg"
								autofocus={true}
								placeholder={T()("agent.composer.placeholder")}
								draftKey="new"
								onSubmit={start}
								start={
									<Show when={agents().length > 1}>
										<AgentPicker
											agents={agents()}
											selected={current()}
											onSelect={(agent) => setAgentKey(agent.key)}
										/>
									</Show>
								}
							/>
						</section>
					)}
				</Show>
			</PageLayout.Body>
		</PageLayout.Root>
	);
};

export default AgentPage;
