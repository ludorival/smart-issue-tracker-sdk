import {
  Error,
  FederatedErrors,
  SavedTrackedErrors,
  TrackErrorOptions,
} from '.'

export async function trackErrors(
  errors: Error[],
  {
    database,
    issueClient,
    projectId,
    compareError = (source, target) =>
      source.message.localeCompare(target.message),
  }: TrackErrorOptions
): Promise<SavedTrackedErrors[]> {
  const compareGroupedError = (
    source: FederatedErrors,
    target: FederatedErrors
  ) => compareError(source.occurrences[0], target.occurrences[0])
  const groupedErrors = zipErrors(
    errors.map<FederatedErrors>(
      (error) =>
        ({
          name: error.message,
          firstOccurrenceTimeStamp: error.timestamp,
          lastOccurrenceTimeStamp: error.timestamp,
          projectId,
          occurrences: [error],
        } as FederatedErrors)
    ),
    compareGroupedError
  )
  const savedErrors = await database.fetch(projectId)
  const newErrors = zipErrors(
    savedErrors.concat(groupedErrors as SavedTrackedErrors[]),
    compareGroupedError
  )
  const newSavedErrors = await Promise.all(
    newErrors.map((error) => {
      return (error.issue && error.id
        ? issueClient.updateIssue(error)
        : issueClient.createIssue(error)
      ).then((issue) => {
        return database.save({ ...error, issue })
      })
    })
  )
  return newSavedErrors
}

function distinctOccurrences(occurences: Error[]) {
  return occurences
    .sort((a, b) => a.timestamp - b.timestamp)
    .filter(
      (error, index, errors) => errors[index - 1]?.timestamp !== error.timestamp
    )
}
function zipErrors<T extends FederatedErrors>(
  errors: T[],
  compareError: (source: T, target: T) => number
): T[] {
  const changedErrors: { [key: string]: boolean } = {}
  return errors
    .sort(compareError)
    .reduce<T[]>((previous, current) => {
      const last = previous[previous.length - 1]
      if (last && compareError(last, current) === 0) {
        const previousLength = last.occurrences.length
        last.occurrences = distinctOccurrences(
          last.occurrences.concat(current.occurrences)
        )
        last.firstOccurrenceTimeStamp = Math.min(
          last.firstOccurrenceTimeStamp,
          current.firstOccurrenceTimeStamp
        )
        last.lastOccurrenceTimeStamp = Math.max(
          last.lastOccurrenceTimeStamp,
          current.lastOccurrenceTimeStamp
        )
        changedErrors[last.id || last.name] =
          previousLength != last.occurrences.length
        return previous
      } else {
        changedErrors[current.id || current.name] = !current.id
        return [...previous, current]
      }
    }, [])
    .filter((e) => changedErrors[e.id || e.name])
}
