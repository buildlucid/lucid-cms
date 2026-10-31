import type { User } from "@types";
import {
	TbOutlineArrowsExchange,
	TbOutlineDeviceMobile,
	TbOutlineKey,
	TbOutlineRefresh,
} from "solid-icons/tb";
import { type Component, createMemo, createSignal, Show } from "solid-js";
import Button from "@/components/Button/Button";
import InfoRow from "@/components/InfoRow/InfoRow";
import TwoFactorDisableModal from "@/components/TwoFactorDisableModal/TwoFactorDisableModal";
import TwoFactorMethodRow from "@/components/TwoFactorMethodRow/TwoFactorMethodRow";
import TwoFactorRecoveryCodesModal from "@/components/TwoFactorRecoveryCodesModal/TwoFactorRecoveryCodesModal";
import TwoFactorSetupModal from "@/components/TwoFactorSetupModal/TwoFactorSetupModal";
import constants from "@/constants";
import T from "@/translations";
import dateHelpers from "@/utils/date-helpers";

interface TwoFactorSettingsProps {
	twoFactor: User["twoFactor"];
}

const TwoFactorSettings: Component<TwoFactorSettingsProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [setupOpen, setSetupOpen] = createSignal(false);
	const [recoveryCodesOpen, setRecoveryCodesOpen] = createSignal(false);
	const [disableOpen, setDisableOpen] = createSignal(false);

	// ----------------------------------------
	// Memos
	const enabled = createMemo(() => props.twoFactor?.enabled === true);
	const required = createMemo(() => props.twoFactor?.required === true);
	const recoveryCodesRemaining = createMemo(
		() => props.twoFactor?.recoveryCodesRemaining ?? 0,
	);
	const recoveryCodesLow = createMemo(
		() => recoveryCodesRemaining() <= constants.twoFactor.lowRecoveryCodes,
	);
	const enabledDate = createMemo(() =>
		dateHelpers.formatFullDate(props.twoFactor?.enabledAt ?? undefined),
	);

	// ----------------------------------------
	// Render
	return (
		<>
			<Show
				when={enabled()}
				fallback={
					<InfoRow.Content
						title={T()("account.two.factor.title")}
						description={
							required()
								? T()("account.two.factor.required.description")
								: T()("account.two.factor.description")
						}
						actions={
							<Button
								variant="outline"
								size="sm"
								type="button"
								onClick={() => setSetupOpen(true)}
							>
								{T()("account.two.factor.setup.action")}
							</Button>
						}
						align="center"
					/>
				}
			>
				<InfoRow.Content
					title={T()("account.two.factor.title")}
					description={
						required()
							? T()("account.two.factor.enabled.required.description")
							: T()("account.two.factor.enabled.description")
					}
					actions={
						<Show when={!required()}>
							<Button
								variant="danger-outline"
								size="sm"
								type="button"
								onClick={() => setDisableOpen(true)}
							>
								{T()("account.two.factor.disable.action")}
							</Button>
						</Show>
					}
				>
					<div class="flex flex-col gap-3">
						<TwoFactorMethodRow
							icon={<TbOutlineDeviceMobile class="size-4.5" />}
							title={T()("account.two.factor.app.title")}
							detail={
								enabledDate()
									? T()("account.two.factor.app.added", {
											date: enabledDate(),
										})
									: T()("account.two.factor.app.active")
							}
							action={
								<Button
									variant="ghost"
									size="sm"
									shape="square"
									title={T()("account.two.factor.app.change.action")}
									aria-label={T()("account.two.factor.app.change.action")}
									onClick={() => setSetupOpen(true)}
								>
									<TbOutlineArrowsExchange class="size-4" />
								</Button>
							}
						/>
						<TwoFactorMethodRow
							icon={<TbOutlineKey class="size-4.5" />}
							title={T()("account.two.factor.recovery.title")}
							detail={
								recoveryCodesLow()
									? T()("account.two.factor.recovery.low", {
											count: recoveryCodesRemaining(),
										})
									: T()("account.two.factor.recovery.remaining", {
											count: recoveryCodesRemaining(),
											total: constants.twoFactor.recoveryCodeCount,
										})
							}
							warning={recoveryCodesLow()}
							action={
								<Button
									variant="ghost"
									size="sm"
									shape="square"
									title={T()("account.two.factor.recovery.regenerate.action")}
									aria-label={T()(
										"account.two.factor.recovery.regenerate.action",
									)}
									onClick={() => setRecoveryCodesOpen(true)}
								>
									<TbOutlineRefresh class="size-4" />
								</Button>
							}
						/>
					</div>
				</InfoRow.Content>
			</Show>

			{/* Modals */}
			<TwoFactorSetupModal
				state={{ open: setupOpen(), setOpen: setSetupOpen }}
				replacing={enabled()}
			/>
			<TwoFactorRecoveryCodesModal
				state={{ open: recoveryCodesOpen(), setOpen: setRecoveryCodesOpen }}
			/>
			<TwoFactorDisableModal
				state={{ open: disableOpen(), setOpen: setDisableOpen }}
			/>
		</>
	);
};

export default TwoFactorSettings;
