'use strict'

export * from './trackErrors'

export type Error = {
  message: string
  timestamp: string
  [key: string]: string
}

export type Issue = {
  id: string
  url: string
  [key: string]: unknown
}
export interface GroupedError {
  id?: string
  name: string
  projectId: string
  firstOccurrenceTimeStamp: string
  lastOccurrenceTimeStamp: string
  issue?: Issue
  occurrences: Error[]
}

export type SavedGroupError = GroupedError & { id: string }
export type SavedGroupErrorWithIssue = SavedGroupError & { issue: Issue }
export interface ErrorDatabase {
  save(errors: GroupedError[]): Promise<SavedGroupError[]>
  fetch(projectId: string): Promise<SavedGroupError[]>
}
export interface IssueClient {
  createIssue(error: GroupedError): Promise<Issue>
  updateIssue(error: SavedGroupErrorWithIssue): Promise<Issue>
}

export type TrackErrorOptions = {
  database: ErrorDatabase
  issueClient: IssueClient
  compareError?: (source: Error, target: Error) => 0 | 1 | -1
}
