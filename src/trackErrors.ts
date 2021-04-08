import {
  Comparator,
  Error,
  FederatedErrors,
  FederatedErrorsUntracked,
  RequiredFederatedErrors,
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
    compareFederatedErrors = (source, target) =>
      compareError(source.newOccurrences[0], target.newOccurrences[0]),
  }: TrackErrorOptions
): Promise<SavedTrackedErrors[]> {
  const compare = compareFederatedErrors

  const federatedErrors: FederatedErrors[] = errors.map((error) => ({
    name: error.message,
    projectId,
    occurrences: [],
    newOccurrences: [error],
    hasChanged: true,
  }))

  const savedErrors: FederatedErrors[] = await database.fetch(projectId)

  const newErrors = savedErrors
    .concat(federatedErrors)
    .sort(compare)
    .reduce(reduceErrors(compare), [])
    .filter(hasChanged)

  const newSavedErrors = await Promise.all(
    newErrors.map((error) => {
      return (error.id && error.issue
        ? issueClient.updateIssue(error as RequiredFederatedErrors)
        : issueClient.createIssue(error as FederatedErrorsUntracked)
      ).then((issue) => {
        delete error.hasChanged
        return database.save({ ...error, issue })
      })
    })
  )

  return newSavedErrors
}

const reduceErrors = (compareError: Comparator<FederatedErrors>) => (
  accumulated: FederatedErrors[],
  current: FederatedErrors
): FederatedErrors[] => {
  const last = accumulated[accumulated.length - 1]
  if (last && compareError(last, current) === 0) {
    const newOccurrences = removeDoublons(
      last.newOccurrences.concat(current.newOccurrences)
    )
    if (newOccurrences.length > last.newOccurrences.length) {
      if (!last.hasChanged) {
        last.occurrences = last.occurrences.concat(last.newOccurrences)
        last.newOccurrences = []
      }
      last.hasChanged = true
      last.newOccurrences = newOccurrences
    }
    return accumulated
  } else {
    return [...accumulated, current]
  }
}

const removeDoublons = (errors: Error[]) =>
  sortErrors(errors).filter(
    (error, i, array) => array[i - 1]?.timestamp !== error.timestamp
  )

const sortErrors = (errors: Error[]) =>
  errors.sort((a, b) => a.timestamp - b.timestamp)

const hasChanged = (errors: FederatedErrors) => !!errors.hasChanged
