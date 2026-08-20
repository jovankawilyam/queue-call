export type QueueStatus = "waiting" | "called" | "done";

export interface QueueItem {
  id: string;
  name: string;
  status: QueueStatus;
  createdAt: string;
  calledAt?: string;
}

export interface CreateQueueItemInput {
  name: string;
}

export interface UpdateQueueItemInput {
  status: QueueStatus;
}

export interface QueueHistoryItem {
  id: string;
  name: string;
  status: QueueStatus;
  createdAt: string;
  calledAt?: string;
  removedAt: string;
}