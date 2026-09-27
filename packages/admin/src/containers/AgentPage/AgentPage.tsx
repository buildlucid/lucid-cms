import { useLocation, useNavigate } from "@solidjs/router";
import type { AgentApprovalMode, AiModelSelection } from "@types";
import {
	type Component,
	createMemo,
	createSignal,
	onMount,
	Show,
} from "solid-js";
import AgentApprovalPicker from "@/components/AgentApprovalPicker/AgentApprovalPicker";
import AgentComposer, {
	type AgentComposerHandle,
} from "@/components/AgentComposer/AgentComposer";
import AgentModelPicker from "@/components/AgentModelPicker/AgentModelPicker";
import AgentUnavailableNotice from "@/components/AgentUnavailableNotice/AgentUnavailableNotice";
import PageLayout from "@/components/PageLayout/PageLayout";
import api from "@/services/api";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import {
	getAgentAccess,
	getAgentUnavailableReason,
} from "@/utils/agent-access";
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
	const location = useLocation<{
		message?: string;
		approvalMode?: AgentApprovalMode;
		modelSelection?: AiModelSelection;
	}>();
	const navigate = useNavigate();
	const returned = location.state?.message;
	const [modelSelection, setModelSelection] =
		createSignal<AiModelSelection | null>(
			location.state?.modelSelection ?? null,
		);
	const [agentKey, setAgentKey] = createSignal<string>();
	const [approvalMode, setApprovalMode] = createSignal<AgentApprovalMode>(
		location.state?.approvalMode ?? "tool-defaults",
	);

	// ----------------------------------------
	// Memos
	const agents = createMemo(() => getAgentAccess().use);
	const unavailable = createMemo(
		() => getAgentUnavailableReason() !== undefined,
	);
	const agent = createMemo(
		() => agents().find((agent) => agent.key === agentKey()) ?? agents()[0],
	);
	//* shares the model picker's query; chat waits for it as it needs the same Lucid connection
	const models = api.agent.useGetModels({ agentKey: () => agent()?.key });
	const name = createMemo(() => {
		const user = userStore.get.user;
		return user?.firstName || user?.username;
	});

	// ----------------------------------------
	// Functions
	const start = (text: string) => {
		const selected = agent();
		if (!selected || unavailable() || !models.isSuccess) return false;
		navigate(`/lucid/agent/chats/${crypto.randomUUID()}`, {
			state: {
				message: text,
				agentKey: selected.key,
				approvalMode: approvalMode(),
				modelSelection: modelSelection() ?? undefined,
			},
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
							<AgentUnavailableNotice>
								<AgentComposer
									ref={(handle: AgentComposerHandle) => {
										if (returned) handle.insert(returned);
									}}
									size="lg"
									autofocus={true}
									disabled={!models.isSuccess}
									placeholder={T()(
										models.isError
											? "agent.composer.placeholder.unreachable"
											: "agent.composer.placeholder",
									)}
									draftKey="new"
									onSubmit={start}
									controls={
										<AgentApprovalPicker
											value={approvalMode()}
											onChange={setApprovalMode}
										/>
									}
									start={
										<Show when={agents().length > 1}>
											<AgentPicker
												agents={agents()}
												selected={current()}
												onSelect={(agent) => {
													setAgentKey(agent.key);
													setModelSelection(null);
												}}
											/>
										</Show>
									}
									end={
										<AgentModelPicker
											agentKey={current().key}
											value={modelSelection()}
											onChange={setModelSelection}
										/>
									}
								/>
							</AgentUnavailableNotice>
						</section>
					)}
				</Show>
			</PageLayout.Body>
		</PageLayout.Root>
	);
};

export default AgentPage;
