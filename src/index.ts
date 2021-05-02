'use strict'

export * from './trackIssues'

export interface Issue<T> {
  id?: string
  url?: string
  occurrences: T[]
}

export type TrackedIssue<T> = T & { id: string }

export interface IssueClient<T extends Issue<R>, R> {
  createIssue(issue: T): Promise<TrackedIssue<T>>
  updateIssue(issue: TrackedIssue<T>): Promise<TrackedIssue<T>>
  fetchIssues(): Promise<TrackedIssue<T>[]>
}
export type Comparator<T> = (source: T, target: T) => number
export interface Hook<T extends Issue<R>, R> {
  initializeNewIssue?: (occurrence: R) => T
  compareIssue?: Comparator<T>
  shouldBundleIssueInto?: (issueToBundle: T, into: T) => boolean
  compareOccurrence?: Comparator<R>
  getIdentifier?: (occurrence: R) => number | string
}
export interface EventHandler<T extends Issue<R>, R> {
  onIgnoredOccurrence?: (source: T, target: T) => void
  onBundledIssue?: (target: T, newOccurences: R[], current: T) => void
  onMatchedTrackedIssues?: (source: T, target: T) => void
  onNotBundledIssue?: (source: T, target?: T) => void
}
export type TrackIssueOptions<T extends Issue<R>, R> = {
  issueClient: IssueClient<T, R>
  hooks: Hook<T, R>
  eventHandler?: EventHandler<T, R>
}
