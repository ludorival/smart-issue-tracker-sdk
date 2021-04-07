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
  occurrences: Error[]
  newOccurrences: Error[]
  hasChanged?: boolean
  issue?: Issue
}
export type SavedTrackedErrors = Omit<Required<FederatedErrors>, 'hasChanged'>
export type NewTrackedErrors = Omit<SavedTrackedErrors, 'id'>
export type TrackedErrors = SavedTrackedErrors | NewTrackedErrors
export type NewFederatedErrors = Omit<FederatedErrors, 'id'>
export type RequiredFederatedErrors = Required<FederatedErrors>
export type FederatedErrorsUntracked = Omit<Required<FederatedErrors>, 'issue'>

export interface ErrorDatabase {
  save(error: TrackedErrors): Promise<SavedTrackedErrors>
  fetch(projectId: string): Promise<SavedTrackedErrors[]>
}
export interface IssueClient {
  createIssue(error: FederatedErrorsUntracked): Promise<Issue>
  updateIssue(error: RequiredFederatedErrors): Promise<Issue>
}
export type Comparator<T> = (source: T, target: T) => number
export type TrackErrorOptions = {
  database: ErrorDatabase
  issueClient: IssueClient
  projectId: string
  compareError?: Comparator<Error>
  compareFederatedErrors?: Comparator<FederatedErrors>
}
