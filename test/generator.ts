import { values } from 'lodash'
import {
  Comparator,
  EventHandler,
  Issue,
  Occurrence,
  TrackIssueOptions,
  trackIssues,
} from '../src/index'
export interface Error extends Occurrence {
  message: string
  ignored?: boolean
  customAttribute?: number
}

export interface TestIssue extends Issue<Error> {
  title: string
  body: string
  comments: string[]
  newOccurrences: Error[]
}
let issuesCollections: { [id: string]: Required<TestIssue> } = {}
export const initOptions = async ({
  initialIssues = [],
  compareOccurrence = (source, target) =>
    source.message.localeCompare(target.message),
  compareIssue = (source, target) =>
    compareOccurrence(source.occurrences[0], target.occurrences[0]),
  eventHandler,
}: {
  initialIssues?: Error[]
  compareOccurrence?: Comparator<Error>
  compareIssue?: Comparator<TestIssue>
  eventHandler?: EventHandler<TestIssue, Error>
} = {}): Promise<TrackIssueOptions<TestIssue, Error>> => {
  issuesCollections = {}
  const options: TrackIssueOptions<TestIssue, Error> = {
    hooks: {
      initializeNewIssue: (occ) => ({
        newOccurrences: [],
        occurrences: [occ],
        title: occ.message,
        body: '',
        comments: [],
      }),
      compareIssue,
      shouldBundleIssueInto: (issueToBundle) =>
        !issueToBundle.occurrences[0]?.ignored,
    },
    issueClient: {
      createIssue: jest.fn().mockImplementation((issue: TestIssue) => {
        const id = issue.occurrences[0].timestamp.toString()
        issuesCollections[id] = {
          ...issue,
          id,
          url: `https://issue-tracker/project/${id}`,
          title: issue.occurrences[0].message,
          body: `Found ${issue.occurrences.length} occurences of "${issue.occurrences[0].message}"`,
          comments: [],
        }
        return Promise.resolve(issuesCollections[id])
      }),
      fetchIssues: jest.fn().mockImplementation(() => {
        return Promise.resolve(values(issuesCollections))
      }),
      updateIssue: jest
        .fn()
        .mockImplementation((issue: Required<TestIssue>) => {
          issuesCollections[issue.id] = {
            ...issuesCollections[issue.id],
            comments: [
              ...(issuesCollections[issue.id]?.comments as string[]),
              `Found new ${issue.newOccurrences.length} occurences of ${issue.title}`,
            ],
          }
          return Promise.resolve(issuesCollections[issue.id])
        }),
    },
    fetchOption: {},
    eventHandler: {
      ...eventHandler,
      onBundledIssue: (target, newOccurrences) =>
        (target.newOccurrences = (target.newOccurrences || []).concat(
          newOccurrences
        )),
      onNotBundledIssue: (source, target) => {
        if (!target && !source.id) {
          source.newOccurrences = source.occurrences
        }
      },
    },
  }
  initialIssues.length && (await trackIssues(initialIssues, options))
  jest.clearAllMocks()
  return options
}
let lastTimestamp = 0

export const anError = (message: string, timestamp?: number): Error => {
  if (!timestamp) {
    lastTimestamp += 1
    timestamp = lastTimestamp
  }
  return {
    message,
    timestamp,
  }
}

beforeEach(() => {
  lastTimestamp = 0
})
