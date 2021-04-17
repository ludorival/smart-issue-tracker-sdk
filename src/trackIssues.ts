import {
  EventHandler,
  Hook,
  Issue,
  TrackIssueOptions,
  TrackedIssue,
  Comparator,
} from '.'

export async function trackIssues<T extends Issue<R>, R>(
  occurrences: R[],
  {
    issueClient,
    hooks: {
      initializeNewIssue = (occurrence: R) =>
        ({ occurrences: [occurrence] } as T),
      ...rest
    },
    eventHandler = {},
  }: TrackIssueOptions<T, R>
): Promise<TrackedIssue<T>[]> {
  const newIssues: T[] = occurrences.map((occurrence) =>
    initializeNewIssue(occurrence)
  )

  const savedIssues: T[] = await issueClient.fetchIssues()

  const bundledIssues = bundleIssues(savedIssues, newIssues, rest, eventHandler)

  const trackedIssues = await Promise.all(
    bundledIssues.map((issue) => {
      return issue.id
        ? issueClient.updateIssue(issue as TrackedIssue<T>)
        : issueClient.createIssue(issue)
    })
  )

  return trackedIssues
}

function bundleIssues<T extends Issue<R>, R>(
  savedIssues: T[],
  newIssues: T[],
  {
    shouldBundleIssueInto = () => true,
    compareIssue,
    compareOccurrence,
  }: Hook<T, R>,
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
          ? compareOccurrence
            ? keepNewOccurrences<T, R>(last, current, compareOccurrence)
            : current.occurrences
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
type ExtendedOccurrence<R> = { target: boolean; occurrence: R }
const keepNewOccurrences = <T extends Issue<R>, R>(
  fromIssue: T,
  toIssue: T,
  compareOccurrence: Comparator<R>
): R[] => {
  const extendedTargetOccurences = toIssue.occurrences.map((occurrence) => ({
    target: true,
    occurrence,
  }))
  const extendedFromOccurences = fromIssue.occurrences.map((occurrence) => ({
    target: false,
    occurrence,
  }))
  const compare: Comparator<ExtendedOccurrence<R>> = (a, b) =>
    compareOccurrence(a.occurrence, b.occurrence)
  const newOnes = extendedFromOccurences
    .concat(extendedTargetOccurences)
    .sort(compare)
    .reduce<ExtendedOccurrence<R>[]>((acc, value, i, array) => {
      if (array[i + 1] && compare(value, array[i + 1]) === 0) {
        return acc
      }
      if (array[i - 1] && compare(value, array[i - 1]) === 0) {
        return acc
      }
      if (!value.target) {
        return acc
      }
      return acc.concat(value)
    }, [])
    .map((e) => e.occurrence)
  return newOnes
}
