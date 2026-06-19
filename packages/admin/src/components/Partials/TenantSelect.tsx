import { DropdownMenu } from "@kobalte/core";
import classNames from "classnames";
import { FaSolidCheck, FaSolidSort } from "solid-icons/fa";
import { type Component, createMemo, createSignal, For, Show } from "solid-js";
import DropdownContent from "@/components/Partials/DropdownContent";
import tenantStore from "@/store/tenantStore";
import T, { translateAdminCopy } from "@/translations";

interface TenantSelectProps {
	class?: string;
}

const TenantSelect: Component<TenantSelectProps> = (props) => {
	// ----------------------------------
	// State
	const [open, setOpen] = createSignal(false);

	// ----------------------------------
	// Memos
	const tenants = createMemo(() => tenantStore.get.tenants);
	const hasMultipleTenants = createMemo(() => tenants().length > 1);
	const activeTenant = createMemo(() =>
		tenants().find((t) => t.key === tenantStore.get.tenant),
	);
	const activeName = createMemo(() => {
		const tenant = activeTenant();
		return tenant ? translateAdminCopy(tenant.name) : "";
	});

	// ----------------------------------------
	// Render
	return (
		<Show when={hasMultipleTenants()}>
			<div class={props.class}>
				<DropdownMenu.Root
					sameWidth={true}
					open={open()}
					onOpenChange={setOpen}
					flip={true}
					gutter={6}
				>
					<DropdownMenu.Trigger
						aria-label={T()("common.switch.tenant")}
						class="group w-full flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left transition-colors duration-200 hover:bg-white/5 focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary-base"
					>
						<span class="flex min-w-0 flex-col">
							<span class="text-[11px] leading-none text-body">
								{T()("common.workspace")}
							</span>
							<span class="mt-1 truncate text-sm font-medium leading-tight text-title">
								{activeName()}
							</span>
						</span>
						<FaSolidSort
							size={13}
							class="shrink-0 text-body transition-colors group-hover:text-subtitle"
						/>
					</DropdownMenu.Trigger>
					<DropdownContent
						options={{
							anchorWidth: true,
							rounded: true,
							class: "z-70 p-1.5!",
							maxHeight: "md",
							noMargin: true,
						}}
					>
						<ul class="flex flex-col gap-0.5">
							<For each={tenants()}>
								{(tenant) => {
									const name = createMemo(() =>
										translateAdminCopy(tenant.name),
									);
									const selected = createMemo(
										() => tenant.key === tenantStore.get.tenant,
									);
									return (
										<li>
											<button
												type="button"
												class={classNames(
													"w-full flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm font-medium transition-colors hover:bg-card-hover hover:text-title focus:outline-hidden focus-visible:bg-card-hover",
													{
														"text-title": selected(),
														"text-subtitle": !selected(),
													},
												)}
												onClick={() => {
													tenantStore.get.setTenant(tenant.key);
													setOpen(false);
												}}
											>
												<span class="truncate">{name()}</span>
												<Show when={selected()}>
													<FaSolidCheck
														size={13}
														class="shrink-0 text-primary-base"
													/>
												</Show>
											</button>
										</li>
									);
								}}
							</For>
						</ul>
					</DropdownContent>
				</DropdownMenu.Root>
			</div>
		</Show>
	);
};

export default TenantSelect;
