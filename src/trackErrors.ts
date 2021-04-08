import {
  Comparator,
  Error,
  BundledErrors,
  BundledErrorsUntracked,
  RequiredBundledErrors,
  SavedTrackedErrors,
  TrackErrorOptions,
  EventHandler,
} from '.'

export async function trackErrors(
  errors: Error[],
  {
    database,
    issueClient,
    projectId,
    compareError = (source, target) =>
      source.message.localeCompare(target.message),
    compareBundledErrors = (source, target) =>
      compareError(source.newOccurrences[0], target.newOccurrences[0]),
    eventHandler = {},
  }: TrackErrorOptions
): Promise<SavedTrackedErrors[]> {
  const compare = compareBundledErrors

  const bundledErrors: BundledErrors[] = errors.map((error) => ({
    name: error.message,
    projectId,
    occurrences: [],
    newOccurrences: [error],
    hasChanged: true,
  }))

  const savedErrors: BundledErrors[] = await database.fetch(projectId)

  const newErrors = savedErrors
    .concat(bundledErrors)
    .sort(compare)
    .reduce(reduceErrors(compare, eventHandler), [])
    .filter(hasChanged)

  const newSavedErrors = await Promise.all(
    newErrors.map((error) => {
      return (error.id && error.issue
        ? issueClient.updateIssue(error as RequiredBundledErrors)
        : issueClient.createIssue(error as BundledErrorsUntracked)
      ).then((issue) => {
        delete error.hasChanged
        return database.save({ ...error, issue })
      })
    })
  )

  return newSavedErrors
}

const reduceErrors = (
  compareError: Comparator<BundledErrors>,
  {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    onIgnoredError = () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    onBundledErrors = () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    onMatchedTrackedErrors = () => {},
  }: EventHandler
) => (
  accumulated: BundledErrors[],
  current: BundledErrors
): BundledErrors[] => {
  const last = accumulated[accumulated.length - 1]
  if (last && compareError(last, current) === 0) {
    if (last.id && current.id) {
      onMatchedTrackedErrors(
        last as SavedTrackedErrors,
        current as SavedTrackedErrors
      )
      return [...accumulated, current]
    } else {
      const newOccurrences = keepNewOccurrences(last, current)
      if (newOccurrences.length > 0) {
        if (!last.hasChanged) {
          last.occurrences = last.occurrences.concat(last.newOccurrences)
          last.newOccurrences = []
        }
        last.hasChanged = true
        last.newOccurrences = last.newOccurrences.concat(newOccurrences)
        onBundledErrors(last, current)
      } else {
        onIgnoredError(last, current)
      }
    }
    return accumulated
  } else {
    return [...accumulated, current]
  }
}

const keepNewOccurrences = (
  fromErrors: BundledErrors,
  toErrors: BundledErrors
): Error[] => {
  const newOnes = sortErrors(
    fromErrors.occurrences.concat(fromErrors.newOccurrences).concat(
      toErrors.newOccurrences.map((error) => ({
        ...error,
        parentBundledError: toErrors.name,
      }))
    )
  )
    .filter((error, i, array) => array[i - 1]?.timestamp !== error.timestamp)
    .filter((error) => error.parentBundledError)
    .map((error) => {
      delete error.parentBundledError
      return error
    })
  return newOnes
}
const sortErrors = (errors: Error[]) =>
  errors.sort((a, b) => a.timestamp - b.timestamp)

const hasChanged = (errors: BundledErrors) => !!errors.hasChanged
