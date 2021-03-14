'use strict'

export * from './trackErrors'

export type Error = {
  message: string
  timestamp: number
  [key: string]: unknown
}

export type Issue = {
  id: string
  url: string
  [key: string]: unknown
}
export interface FederatedErrors {
  id?: string
  name: string
  projectId: string
  firstOccurrenceTimeStamp: number
  lastOccurrenceTimeStamp: number
  occurrences: Error[]
}

export type TrackedErrors = FederatedErrors & { issue: Issue }

export type SavedTrackedErrors = TrackedErrors & { id: string }
export interface ErrorDatabase {
  save(error: TrackedErrors): Promise<SavedTrackedErrors>
  fetch(projectId: string): Promise<SavedTrackedErrors[]>
}
export interface IssueClient {
  createIssue(error: FederatedErrors): Promise<Issue>
  updateIssue(error: SavedTrackedErrors): Promise<Issue>
}
export type Comparator = (source: Error, target: Error) => number
export type TrackErrorOptions = {
  database: ErrorDatabase
  issueClient: IssueClient
  projectId: string
  compareError?: Comparator
}
