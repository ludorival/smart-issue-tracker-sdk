import { values } from 'lodash'
import {
  Comparator,
  Error,
  FederatedErrorsUntracked,
  Issue,
  RequiredFederatedErrors,
  SavedTrackedErrors,
  TrackErrorOptions,
  trackErrors,
} from '../src/index'

let errorsCollections: { [id: string]: SavedTrackedErrors } = {}
let issueCollections: { [id: string]: Issue } = {}
export const initOptions = async (
  initialErrors: Error[] = [],
  compareError?: Comparator<Error>
): Promise<TrackErrorOptions> => {
  errorsCollections = {}
  issueCollections = {}
  const options = {
    database: {
      save: jest.fn().mockImplementation((error: SavedTrackedErrors) => {
        errorsCollections[error.name] = {
          ...error,

          id: error.name.replace(/\s/g, '-').toLowerCase(),
        }
        return Promise.resolve(errorsCollections[error.name])
      }),
      fetch: jest.fn().mockImplementation((projectId: string) => {
        return Promise.resolve(
          values(errorsCollections).filter((e) => e.projectId === projectId)
        )
      }),
    },
    issueClient: {
      createIssue: jest
        .fn()
        .mockImplementation((error: FederatedErrorsUntracked) => {
          const id = error.newOccurrences[0].timestamp.toString()
          issueCollections[id] = {
            id,
            url: `https://issue-tracker/project/${error.projectId}/${id}`,
            title: error.name,
            body: `Found ${error.newOccurrences.length} occurences of "${error.name}"`,
            comments: [],
          }
          return Promise.resolve(issueCollections[id])
        }),
      updateIssue: jest
        .fn()
        .mockImplementation((error: RequiredFederatedErrors) => {
          issueCollections[error.issue.id] = {
            ...issueCollections[error.issue.id],
            comments: [
              ...(issueCollections[error.issue.id]?.comments as string[]),
              `Found new ${error.newOccurrences.length} occurences of ${error.name}`,
            ],
          }
          return Promise.resolve(issueCollections[error.issue.id])
        }),
    },
    projectId: 'test',
    compareError,
  }
  initialErrors.length && (await trackErrors(initialErrors, options))
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
