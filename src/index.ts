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

export interface BundledErrors {
  id?: string
  name: string
  projectId: string
  occurrences: Error[]
  newOccurrences: Error[]
  hasChanged?: boolean
  issue?: Issue
}
export type SavedTrackedErrors = Omit<Required<BundledErrors>, 'hasChanged'>
export type NewTrackedErrors = Omit<SavedTrackedErrors, 'id'>
export type TrackedErrors = SavedTrackedErrors | NewTrackedErrors
export type NewBundledErrors = Omit<BundledErrors, 'id'>
export type RequiredBundledErrors = Required<BundledErrors>
export type BundledErrorsUntracked = Omit<Required<BundledErrors>, 'issue'>

export interface ErrorDatabase {
  save(error: TrackedErrors): Promise<SavedTrackedErrors>
  fetch(projectId: string): Promise<SavedTrackedErrors[]>
}
export interface IssueClient {
  createIssue(error: BundledErrorsUntracked): Promise<Issue>
  updateIssue(error: RequiredBundledErrors): Promise<Issue>
}
export type Comparator<T> = (source: T, target: T) => number
export interface EventHandler {
  onIgnoredError?: (source: BundledErrors, target: BundledErrors) => void
  onBundledErrors?: (source: BundledErrors, target: BundledErrors) => void
  onMatchedTrackedErrors?: (
    source: SavedTrackedErrors,
    target: SavedTrackedErrors
  ) => void
}
export type TrackErrorOptions = {
  database: ErrorDatabase
  issueClient: IssueClient
  projectId: string
  compareError?: Comparator<Error>
  compareBundledErrors?: Comparator<BundledErrors>
  eventHandler?: EventHandler
}
