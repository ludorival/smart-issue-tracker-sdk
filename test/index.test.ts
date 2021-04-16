import { difference } from 'lodash'
import { Comparator, trackIssues } from '../src/index'
import { anError, Error, TestIssue, initOptions } from './generator'

describe('Track New Errors', () => {
  test('should track a new error', async () => {
    // given
    const errors: Error[] = [anError('A new error')]
    const options = await initOptions()
    // when
    const trackedErrors = await trackIssues(errors, options)
    // then
    expect(options.issueClient.createIssue).toHaveBeenCalled()
    expect(trackedErrors).toMatchSnapshot()
  })

  test('should zip sames new errors together', async () => {
    // given
    const errors: Error[] = [
      anError('A new error'),
      anError('Another error'),
      anError('A new error'),
      anError('A new error'),
      anError('Another error'),
      anError('Still an error'),
    ]
    const options = await initOptions()
    // when
    const trackedErrors = await trackIssues(errors, options)
    // then
    expect(trackedErrors).toHaveLength(3)
    expect(trackedErrors[0].occurrences).toHaveLength(3)
    expect(trackedErrors[1].occurrences).toHaveLength(2)
    expect(trackedErrors[2].occurrences).toHaveLength(1)
    expect(options.issueClient.createIssue).toHaveBeenCalled()
    expect(trackedErrors).toMatchSnapshot()
  })

  test('should ignore an occurrence from an attribute', async () => {
    // given
    const errors: Error[] = [
      anError('Error 1'),
      { ...anError('Error 2'), ignored: true },
      anError('Error 3'),
    ]
    const onIgnoredOccurrence = jest.fn()
    const options = await initOptions({ eventHandler: { onIgnoredOccurrence } })
    // when
    const trackedErrors = await trackIssues(errors, options)
    // then
    expect(trackedErrors).toHaveLength(2)
    expect(trackedErrors[0].occurrences).toHaveLength(1)
    expect(trackedErrors[1].occurrences).toHaveLength(1)
    expect(options.issueClient.createIssue).toHaveBeenCalled()
    expect(onIgnoredOccurrence).toHaveBeenCalledTimes(1)
  })
})

describe('Track Existing Errors', () => {
  test('should track an existing error', async () => {
    // given
    const options = await initOptions({
      initialIssues: [anError('A new error')],
    })
    const errors: Error[] = [anError('A new error')]

    // when
    const trackedErrors = await trackIssues(errors, options)
    // then
    expect(trackedErrors).toHaveLength(1)
    expect(trackedErrors[0].occurrences).toHaveLength(2)
    expect(options.issueClient.createIssue).toHaveBeenCalledTimes(0)
    expect(options.issueClient.updateIssue).toHaveBeenCalled()
    expect(trackedErrors).toMatchSnapshot()
  })

  test('should track multiples existing errors', async () => {
    // given
    const options = await initOptions({
      initialIssues: [
        anError('Error 1'),
        anError('Error 2'),
        anError('Error 1'),
        anError('Error 2'),
        anError('Error 3'),
      ],
    })
    const errors: Error[] = [
      anError('Error 1'),
      anError('Error 2'),
      anError('Error 1'),
      anError('Error 4'),
      anError('Error 4'),
    ]

    // when
    const trackedErrors = await trackIssues(errors, options)
    // then
    expect(trackedErrors).toHaveLength(3)
    expect(trackedErrors[0].occurrences).toHaveLength(4)
    expect(trackedErrors[1].occurrences).toHaveLength(3)
    expect(trackedErrors[2].occurrences).toHaveLength(2)
    expect(options.issueClient.createIssue).toHaveBeenCalledTimes(1)
    expect(options.issueClient.updateIssue).toHaveBeenCalledTimes(2)
    expect(trackedErrors).toMatchSnapshot()
  })

  test('should not track errors with same timestamp', async () => {
    // given
    const options = await initOptions({
      initialIssues: [
        anError('Error 1', 2),
        anError('Error 2', 3),
        anError('Error 2', 4),
      ],
    })
    const errors: Error[] = [
      anError('Error 1', 1),
      anError('Error 1', 2),
      anError('Error 1', 3),
      anError('Error 2', 3),
      anError('Error 2', 4),
    ]
    // when
    const trackedErrors = await trackIssues(errors, options)
    // then
    expect(trackedErrors).toHaveLength(1)
    expect(trackedErrors[0].occurrences).toHaveLength(3)
    expect(options.issueClient.createIssue).toHaveBeenCalledTimes(0)
    expect(options.issueClient.updateIssue).toHaveBeenCalledTimes(1)
  })

  test('should ignore matched errors for already tracked errors', async () => {
    // given
    const options = await initOptions({
      initialIssues: [anError('Error 1', 1), anError('Error 2', 2)],
    })
    const errors: Error[] = [anError('Error 3', 1)]
    const onMatchedTrackedIssues = jest.fn()
    // when
    const trackedErrors = await trackIssues(errors, {
      ...options,
      hooks: {
        compareIssue: () => 0,
      },
      eventHandler: {
        onMatchedTrackedIssues,
      },
    })
    // then
    expect(trackedErrors).toHaveLength(1)
    expect(onMatchedTrackedIssues).toHaveBeenCalled()
    expect(options.issueClient.createIssue).toHaveBeenCalledTimes(0)
    expect(options.issueClient.updateIssue).toHaveBeenCalledTimes(1)
  })
})

describe('Custom comparator', () => {
  test('should use a custom comparator based on differences threshold', async () => {
    // given
    const comparator: Comparator<Error> = (a, b) => {
      const threshold =
        (a.message.length -
          difference(a.message.split(''), b.message.split('')).length) /
        a.message.length
      return threshold >= 0.8 ? 0 : a.message.localeCompare(b.message)
    }
    const options = await initOptions({
      initialIssues: [],
      compareOccurrence: comparator,
    })

    // when
    const trackedErrors = await trackIssues(
      [anError('Error 1 : Arg0'), anError('Error 1 : Arg1')],
      options
    )

    // then
    expect(trackedErrors).toHaveLength(1)
    expect(trackedErrors[0].occurrences).toHaveLength(2)
    expect(trackedErrors).toMatchSnapshot()
  })

  test('should use a custom comparator based on an error attribute', async () => {
    // given
    const comparator: Comparator<Error> = (a, b) =>
      (a.customAttribute as number) - (b.customAttribute as number)
    const options = await initOptions({
      initialIssues: [],
      compareOccurrence: comparator,
    })
    const errors: Error[] = [
      { ...anError('Error 1'), customAttribute: 1 },
      { ...anError('Error 1'), customAttribute: 2 },
      { ...anError('Error 1'), customAttribute: 1 },
    ]

    // when
    const trackedErrors = await trackIssues(errors, options)

    // then
    expect(trackedErrors).toHaveLength(2)
    expect(trackedErrors[0].occurrences).toHaveLength(2)
    expect(trackedErrors[1].occurrences).toHaveLength(1)
    expect(trackedErrors).toMatchSnapshot()
  })

  test('should use a custom bundled comparator comparator ', async () => {
    // given
    const comparator: Comparator<Error> = (a, b) => {
      const wordsA = a.message.split(' ')
      const wordsB = b.message.split(' ')
      const diff = difference(wordsA, wordsB)
      const threshold = (wordsA.length - diff.length) / wordsA.length
      return threshold >= 0.8 ? 0 : a.message.localeCompare(b.message)
    }
    const comparatorBundledErrors: Comparator<TestIssue> = (a, b) =>
      b.occurrences.some((occ) => comparator(a.occurrences[0], occ) === 0)
        ? 0
        : comparator(a.occurrences[0], b.occurrences[0])
    const options = await initOptions({
      initialIssues: [],
      compareOccurrence: undefined,
      compareIssue: comparatorBundledErrors,
    })

    // when
    const trackedErrors = await trackIssues(
      [
        anError('Long Error with multiple Arguments : (Arg1, Arg2, Arg3)'),
        anError('Long Error with multiple Arguments : (Arg5, Arg4, Arg3)'),
        anError('Long Error with multiple Arguments : (Arg0, Arg7, Arg8)'),
        anError('Long Error with multiple Arguments : (Arg1, Arg2, Arg4)'),
      ],
      options
    )

    // then
    expect(trackedErrors).toHaveLength(3)
    expect(trackedErrors[1].occurrences).toHaveLength(2)
    expect(trackedErrors).toMatchSnapshot()
  })
})
