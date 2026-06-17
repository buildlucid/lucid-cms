# Lucid CMS - Worker Queues Plugin

> The official DB-backed worker queues for Lucid CMS

This plugin registers a Node worker-thread queue adapter for background jobs and scheduled work.

## Installation

```bash
npm install @lucidcms/plugin-worker-queues
```

## Setup

```ts
import { configureLucid } from "@lucidcms/core";
import { node } from "@lucidcms/runtime-node";
import { workerQueuesPlugin } from "@lucidcms/plugin-worker-queues";
import { sqlite } from "@lucidcms/db-sqlite";

export default configureLucid({
	runtime: node,
	db: sqlite,
	config: () => ({
		plugins: [
			workerQueuesPlugin({
				concurrentLimit: 5,
				batchSize: 10,
			}),
		],
	}),
});
```

## Configuration

| Property | Type | Description |
|----------|------|-------------|
| `concurrentLimit` | `number` | Maximum number of jobs the worker can process concurrently. |
| `batchSize` | `number` | Number of jobs the worker can claim per batch. |
