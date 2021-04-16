'use strict'

export * from './trackIssues'

export interface Occurrence {
  timestamp: number
}

export interface Issue<T extends Occurrence = Occurrence> {
  id?: string
  url?: string
  occurrences: T[]
}

export type TrackedIssue<T> = T & { id: string }
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface FetchOption {}

export interface IssueClient<
  T extends Issue<R>,
  R extends Occurrence = Occurrence,
  S extends FetchOption = FetchOption
> {
  createIssue(issue: T): Promise<TrackedIssue<T>>
  updateIssue(issue: TrackedIssue<T>): Promise<TrackedIssue<T>>
  fetchIssues(options: S): Promise<TrackedIssue<T>[]>
}
export type Comparator<T> = (source: T, target: T) => number
export interface Hook<T extends Issue<R>, R extends Occurrence = Occurrence> {
  initializeNewIssue?: (occurrence: R) => T
  compareIssue: Comparator<T>
  shouldBundleIssueInto?: (issueToBundle: T, into: T) => boolean
}
export interface EventHandler<
  T extends Issue<R>,
  R extends Occurrence = Occurrence
> {
  onIgnoredOccurrence?: (source: T, target: T) => void
  onBundledIssue?: (target: T, newOccurences: R[]) => void
  onMatchedTrackedIssues?: (source: T, target: T) => void
  onNotBundledIssue?: (source: T, target?: T) => void
}
export type TrackIssueOptions<
  T extends Issue<R>,
  R extends Occurrence = Occurrence,
  S extends FetchOption = FetchOption
> = {
  issueClient: IssueClient<T, R, S>
  fetchOption: S
  hooks: Hook<T, R>
  eventHandler?: EventHandler<T, R>
}
