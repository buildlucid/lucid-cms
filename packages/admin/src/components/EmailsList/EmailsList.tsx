import {
	FaSolidAt,
	FaSolidBolt,
	FaSolidCalendar,
	FaSolidCircleCheck,
	FaSolidLayerGroup,
	FaSolidPaperPlane,
	FaSolidT,
	FaSolidTag,
} from "solid-icons/fa";
import { type Component, Index } from "solid-js";
import DeleteEmailModal from "@/components/DeleteEmailModal/DeleteEmailModal";
import { DynamicContent } from "@/components/DynamicContent/DynamicContent";
import EmailTableRow from "@/components/EmailTableRow/EmailTableRow";
import { PaginatedFooter } from "@/components/PaginatedFooter/PaginatedFooter";
import PreviewEmailDrawer from "@/components/PreviewEmailDrawer/PreviewEmailDrawer";
import ResendEmailModal from "@/components/ResendEmailModal/ResendEmailModal";
import { Table } from "@/components/Table/Table";
import ViewEmailTransactionsDrawer from "@/components/ViewEmailTransactionsDrawer/ViewEmailTransactionsDrawer";
import type { QueryStateResponse } from "@/hooks/useQueryState/useQueryState";
import useRowTarget from "@/hooks/useRowTarget/useRowTarget";
import api from "@/services/api";
import T from "@/translations";

export const EmailsList: Component<{
	state: {
		searchParams: QueryStateResponse;
	};
}> = (props) => {
	// ----------------------------------
	// Hooks
	const rowTarget = useRowTarget({
		triggers: {
			preview: false,
			delete: false,
			resend: false,
			transactions: false,
		},
	});

	// ----------------------------------
	// Queries
	const emails = api.email.useGetMultiple({
		queryParams: {
			queryString: props.state.searchParams.queryString,
		},
		enabled: () => props.state.searchParams.ready(),
	});

	// ----------------------------------------
	// Render
	return (
		<DynamicContent
			state={{
				isError: emails.isError,
				isSuccess: emails.isSuccess,
				isEmpty: emails.data?.data.length === 0,
				searchParams: props.state.searchParams,
			}}
			slot={{
				footer: (
					<PaginatedFooter
						state={{
							searchParams: props.state.searchParams,
							meta: emails.data?.meta,
						}}
						options={{
							padding: "24",
						}}
					/>
				),
			}}
			copy={{
				noEntries: {
					title: T()("empty.states.emails.title"),
					description: T()("empty.states.emails.description"),
				},
			}}
		>
			<Table
				key={"emails.list.v2"}
				rows={emails.data?.data.length || 0}
				searchParams={props.state.searchParams}
				head={[
					{
						label: T()("common.status"),
						key: "currentStatus",
						icon: <FaSolidCircleCheck />,
						minWidth: 140,
					},
					{
						label: T()("common.subject"),
						key: "subject",
						icon: <FaSolidT />,
						minWidth: 320,
					},
					{
						label: T()("common.to"),
						key: "toAddress",
						icon: <FaSolidAt />,
						minWidth: 240,
					},
					{
						label: T()("email.templates.singular"),
						key: "template",
						icon: <FaSolidLayerGroup />,
						minWidth: 180,
					},
					{
						label: T()("common.type"),
						key: "type",
						icon: <FaSolidTag />,
						minWidth: 120,
					},
					{
						label: T()("common.priority"),
						key: "priority",
						icon: <FaSolidBolt />,
						minWidth: 120,
					},
					{
						label: T()("common.attempt.count"),
						key: "attemptCount",
						icon: <FaSolidPaperPlane />,
						sortable: true,
						minWidth: 140,
					},
					{
						label: T()("common.last.attempt"),
						key: "lastAttemptedAt",
						icon: <FaSolidCalendar />,
						sortable: true,
						minWidth: 170,
					},
				]}
				state={{
					isLoading: emails.isFetching,
					isSuccess: emails.isSuccess,
				}}
				options={{
					isSelectable: false,
				}}
			>
				{({ include, isSelectable, selected, setSelected }) => (
					<Index each={emails.data?.data || []}>
						{(email, i) => (
							<EmailTableRow
								index={i}
								email={email()}
								include={include}
								selected={selected[i]}
								rowTarget={rowTarget}
								options={{
									isSelectable,
								}}
								callbacks={{
									setSelected: setSelected,
								}}
							/>
						)}
					</Index>
				)}
			</Table>
			<PreviewEmailDrawer
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().preview,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("preview", state);
					},
				}}
			/>
			<ViewEmailTransactionsDrawer
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().transactions,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("transactions", state);
					},
				}}
			/>
			<DeleteEmailModal
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().delete,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("delete", state);
					},
				}}
			/>
			<ResendEmailModal
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().resend,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("resend", state);
					},
				}}
			/>
		</DynamicContent>
	);
};
