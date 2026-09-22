import { useQueryClient } from "@tanstack/solid-query";
import type { Component } from "solid-js";
import { EmailsList } from "@/components/EmailsList/EmailsList";
import PageLayout from "@/components/PageLayout/PageLayout";
import QueryToolbar from "@/components/QueryToolbar/QueryToolbar";
import useQueryState, {
	numberFilter,
	sort,
	textFilter,
} from "@/hooks/useQueryState/useQueryState";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";

const EmailsPage: Component = () => {
	// ----------------------------------
	// Hooks & State
	const queryClient = useQueryClient();
	const searchParams = useQueryState({
		mode: "url",
		schema: {
			filters: {
				fromAddress: textFilter(),
				toAddress: textFilter(),
				subject: textFilter(),
				template: textFilter(),
				currentStatus: textFilter(),
				type: textFilter(),
				priority: textFilter(),
				attemptCount: numberFilter(),
				lastAttemptedAt: textFilter(),
				createdAt: textFilter(),
				updatedAt: textFilter(),
			},
			sorts: {
				createdAt: sort({ defaultValue: "desc" }),
				lastAttemptedAt: sort(),
				attemptCount: sort(),
			},
		},
		singleSort: true,
	});

	// ----------------------------------
	// Render
	return (
		<PageLayout.Root>
			<PageLayout.Header
				title={T()("routes.email.title")}
				description={T()("routes.email.description")}
			>
				<QueryToolbar
					queryState={searchParams}
					onRefresh={() => {
						queryClient.invalidateQueries({
							queryKey: queryKeys.email.list(),
						});
					}}
					filterSubject={T()("routes.email.title")}
					filterFields={[
						{
							label: T()("common.from"),
							key: "fromAddress",
							type: "text",
						},
						{
							label: T()("common.to"),
							key: "toAddress",
							type: "text",
						},
						{
							label: T()("common.subject"),
							key: "subject",
							type: "text",
						},
						{
							label: T()("email.templates.singular"),
							key: "template",
							type: "text",
						},
						{
							label: T()("common.status"),
							key: "currentStatus",
							type: "select",
							options: [
								{
									label: T()("common.status.sent"),
									value: "sent",
								},
								{
									label: T()("common.status.delivered"),
									value: "delivered",
								},
								{
									label: T()("common.status.failed"),
									value: "failed",
								},
								{
									label: T()("common.status.delayed"),
									value: "delayed",
								},
								{
									label: T()("common.status.complained"),
									value: "complained",
								},
								{
									label: T()("common.status.bounced"),
									value: "bounced",
								},
								{
									label: T()("common.status.clicked"),
									value: "clicked",
								},
								{
									label: T()("common.status.opened"),
									value: "opened",
								},
								{
									label: T()("common.status.scheduled"),
									value: "scheduled",
								},
							],
						},
						{
							label: T()("common.type"),
							key: "type",
							type: "select",
							options: [
								{
									label: T()("common.internal"),
									value: "internal",
								},
								{
									label: T()("common.external"),
									value: "external",
								},
							],
						},
						{
							label: T()("common.priority"),
							key: "priority",
							type: "select",
							options: [
								{
									label: "Low",
									value: "low",
								},
								{
									label: "Normal",
									value: "normal",
								},
								{
									label: "High",
									value: "high",
								},
							],
						},
						{
							label: T()("common.attempt.count"),
							key: "attemptCount",
							type: "number",
						},
						{
							label: T()("common.last.attempt.at"),
							key: "lastAttemptedAt",
							type: "datetime",
						},
						{
							label: T()("common.created.at"),
							key: "createdAt",
							type: "datetime",
						},
						{
							label: T()("common.updated.at"),
							key: "updatedAt",
							type: "datetime",
						},
					]}
					sorts={[
						{
							label: T()("common.attempt.count"),
							key: "attemptCount",
						},
						{
							label: T()("common.last.attempt.at"),
							key: "lastAttemptedAt",
						},
						{
							label: T()("common.created.at"),
							key: "createdAt",
						},
					]}
					perPage
				/>
			</PageLayout.Header>
			<PageLayout.Body>
				<EmailsList
					state={{
						searchParams: searchParams,
					}}
				/>
			</PageLayout.Body>
		</PageLayout.Root>
	);
};

export default EmailsPage;
