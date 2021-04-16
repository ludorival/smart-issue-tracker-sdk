import {
  EventHandler,
  FetchOption,
  Hook,
  Issue,
  Occurrence,
  TrackIssueOptions,
  TrackedIssue,
} from '.'

export async function trackIssues<
  T extends Issue<R>,
  R extends Occurrence = Occurrence,
  S extends FetchOption = FetchOption
>(
  occurrences: R[],
  {
    issueClient,
    fetchOption,
    hooks: {
      shouldBundleIssueInto = () => true,
      initializeNewIssue = (occurrence: R) =>
        ({ occurrences: [occurrence] } as T),
      compareIssue,
    },
    eventHandler = {},
  }: TrackIssueOptions<T, R, S>
): Promise<TrackedIssue<T>[]> {
  const newIssues: T[] = occurrences.map((occurrence) =>
    initializeNewIssue(occurrence)
  )

  const savedIssues: T[] = await issueClient.fetchIssues(fetchOption)

  const bundledIssues = bundleIssues(
    savedIssues,
    newIssues,
    { shouldBundleIssueInto, compareIssue },
    eventHandler
  )

  const trackedIssues = await Promise.all(
    bundledIssues.map((issue) => {
      return issue.id
        ? issueClient.updateIssue(issue as TrackedIssue<T>)
        : issueClient.createIssue(issue)
    })
  )

  return trackedIssues
}

function bundleIssues<T extends Issue<R>, R extends Occurrence>(
  savedIssues: T[],
  newIssues: T[],
  {
    shouldBundleIssueInto,
    compareIssue,
  }: Omit<Required<Hook<T, R>>, 'initializeNewIssue'>,
  {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    onIgnoredOccurrence = () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    onBundledIssue = () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    onMatchedTrackedIssues = () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    onNotBundledIssue = () => {},
  }: EventHandler<T, R>
): T[] {
  const mapBundled: { [key: string]: boolean } = {}
  return savedIssues
    .concat(newIssues)
    .sort(compareIssue)
    .reduce<T[]>((accumulated, current) => {
      const last = accumulated[accumulated.length - 1]
      const similar = last && compareIssue(last, current) === 0
      const shouldBundle = shouldBundleIssueInto(current, last)
      const newOccurrences =
        similar && last && shouldBundle
          ? keepNewOccurrences<T, R>(last, current)
          : []

      if (similar && last?.id && current.id) {
        onMatchedTrackedIssues(last, current)
      } else if ((similar && !newOccurrences.length) || !shouldBundle) {
        onIgnoredOccurrence(current, last)
        return accumulated
      } else if (similar && newOccurrences.length) {
        last.occurrences = last.occurrences.concat(newOccurrences)
        if (last.id) mapBundled[last.id] = true
        onBundledIssue(last, newOccurrences)
        return accumulated
      } else if (last) {
        onNotBundledIssue(current, last)
      }
      return [...accumulated, current]
    }, [])
    .filter((issue) => !issue.id || mapBundled[issue.id])
}

const keepNewOccurrences = <
  T extends Issue<R>,
  R extends Occurrence = Occurrence
>(
  fromIssue: T,
  toIssue: T
): R[] => {
  const newMapping: { [key: number]: boolean | undefined } = {}
  toIssue.occurrences.forEach((o) => (newMapping[o.timestamp] = true))
  const newOnes = sortOccurrences(
    fromIssue.occurrences.concat(toIssue.occurrences)
  ).reduce<R[]>((acc, value, i, array) => {
    if (value.timestamp === array[i + 1]?.timestamp) {
      return acc
    }
    if (value.timestamp === array[i - 1]?.timestamp) {
      return acc
    }
    if (!newMapping[value.timestamp]) {
      return acc
    }
    return acc.concat(value)
  }, [])
  return newOnes
}
const sortOccurrences = <R extends Occurrence = Occurrence>(errors: R[]) =>
  errors.sort((a, b) => a.timestamp - b.timestamp)
