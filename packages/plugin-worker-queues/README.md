# Lucid CMS - Worker Queues Plugin

> The official DB-backed worker queues for Lucid CMS

This plugin registers a Node worker-thread queue adapter for background jobs and scheduled work.

## Installation

```bash
npm install @lucidcms/worker-queues
```

## Setup

```ts
import { defineConfig } from "@lucidcms/core";
import { node } from "@lucidcms/node";
import { sqlite } from "@lucidcms/sqlite";
import { workerQueues } from "@lucidcms/worker-queues";

export default defineConfig({
  runtime: node,
  db: sqlite,
  config: () => ({
    url: "https://cms.example.com",
    plugins: [
      workerQueues({
        maxConcurrentJobs: 5,
        batchSize: 10,
      }),
    ],
  }),
});
```

## Configuration

| Property            | Type     | Description                                                 |
| ------------------- | -------- | ----------------------------------------------------------- |
| `maxConcurrentJobs` | `number` | Maximum number of jobs the worker can process concurrently. |
| `batchSize`         | `number` | Number of jobs the worker can claim per batch.              |
