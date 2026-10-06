import noPermission from "@assets/illustrations/no-permission.svg?url";
import {
	type Component,
	createMemo,
	createSignal,
	Match,
	Show,
	Switch,
} from "solid-js";
import ActionMenu from "@/components/ActionMenu/ActionMenu";
import AgentHome from "@/components/AgentHome/AgentHome";
import ErrorState from "@/components/ErrorState/ErrorState";
import Link from "@/components/Link/Link";
import PageLayout from "@/components/PageLayout/PageLayout";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import { getGreeting } from "@/utils/greeting";
import { canUseAskView, getHomeView } from "@/utils/home-view";
import HomeOverview from "./parts/HomeOverview";
import HomeViewSwitch from "./parts/HomeViewSwitch";

/**
 * The admin's landing page. Ask opens on the agent's chat box, Overview on a
 * grid of widgets that users can customise and plugins can add to.
 */
const HomePage: Component = () => {
	// ----------------------------------------
	// State & Hooks
	const [editing, setEditing] = createSignal(false);

	// ----------------------------------------
	// Memos
	const hasAnyPermissions = createMemo(() => {
		const user = userStore.get.user;
		if (!user) return true;
		return user.superAdmin === true || (user.permissions?.length ?? 0) > 0;
	});
	const greeting = createMemo(getGreeting);

	// ----------------------------------------
	// Render
	return (
		<Switch>
			<Match when={getHomeView() === "ask"}>
				<PageLayout.Root>
					<PageLayout.Body padding="md" class="blur-background">
						<div data-home-view="ask" class="flex grow flex-col">
							<div class="flex justify-end">
								<HomeViewSwitch />
							</div>
							<AgentHome />
						</div>
					</PageLayout.Body>
				</PageLayout.Root>
			</Match>
			<Match when={getHomeView() === "overview"}>
				<PageLayout.Root>
					<PageLayout.Header
						title={greeting()}
						description={T()("home.overview.description")}
						actions={
							<Show when={hasAnyPermissions() && !editing()}>
								<Show when={canUseAskView()}>
									<HomeViewSwitch />
								</Show>
								<ActionMenu
									size="md"
									placement="bottom-end"
									actions={[
										{
											type: "button",
											label: T()("home.customize"),
											icon: "pen",
											onClick: () => setEditing(true),
										},
									]}
								/>
							</Show>
						}
					/>
					<PageLayout.Body padding="md">
						<div data-home-view="overview" class="flex grow flex-col">
							<Show
								when={hasAnyPermissions()}
								fallback={
									<div class="flex flex-1 items-center justify-center">
										<ErrorState
											image={noPermission}
											title={T()("dashboard.no.access.title")}
											description={T()("dashboard.no.access.description")}
											actions={
												<Link variant="primary" size="sm" href="/lucid/account">
													{T()("dashboard.no.access.account")}
												</Link>
											}
										/>
									</div>
								}
							>
								<HomeOverview
									editing={editing()}
									onEditingChange={setEditing}
								/>
							</Show>
						</div>
					</PageLayout.Body>
				</PageLayout.Root>
			</Match>
		</Switch>
	);
};

export default HomePage;
