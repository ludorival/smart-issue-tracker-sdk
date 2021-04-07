import { difference } from 'lodash'
import { Comparator, Error, FederatedErrors, trackErrors } from '../src/index'
import { anError, initOptions } from './generator'

describe('Track New Errors', () => {
  test('should track a new error', async () => {
    // given
    const errors: Error[] = [anError('A new error')]
    const options = await initOptions()
    // when
    const trackedErrors = await trackErrors(errors, options)
    // then
    expect(options.database.save).toHaveBeenCalled()
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
    const trackedErrors = await trackErrors(errors, options)
    // then
    expect(trackedErrors).toHaveLength(3)
    expect(trackedErrors[0].newOccurrences).toHaveLength(3)
    expect(trackedErrors[1].newOccurrences).toHaveLength(2)
    expect(trackedErrors[2].newOccurrences).toHaveLength(1)
    expect(options.database.save).toHaveBeenCalled()
    expect(options.issueClient.createIssue).toHaveBeenCalled()
    expect(trackedErrors).toMatchSnapshot()
  })
})

describe('Track Existing Errors', () => {
  test('should track an existing error', async () => {
    // given
    const options = await initOptions([anError('A new error')])
    const errors: Error[] = [anError('A new error')]

    // when
    const trackedErrors = await trackErrors(errors, options)
    // then
    expect(trackedErrors).toHaveLength(1)
    expect(trackedErrors[0].newOccurrences).toHaveLength(1)
    expect(options.database.save).toHaveBeenCalled()
    expect(options.issueClient.createIssue).toHaveBeenCalledTimes(0)
    expect(options.issueClient.updateIssue).toHaveBeenCalled()
    expect(trackedErrors).toMatchSnapshot()
  })

  test('should track multiples existing errors', async () => {
    // given
    const options = await initOptions([
      anError('Error 1'),
      anError('Error 2'),
      anError('Error 1'),
      anError('Error 2'),
      anError('Error 3'),
    ])
    const errors: Error[] = [
      anError('Error 1'),
      anError('Error 2'),
      anError('Error 1'),
      anError('Error 4'),
      anError('Error 4'),
    ]

    // when
    const trackedErrors = await trackErrors(errors, options)
    // then
    expect(trackedErrors).toHaveLength(3)
    expect(trackedErrors[0].newOccurrences).toHaveLength(2)
    expect(trackedErrors[1].newOccurrences).toHaveLength(1)
    expect(trackedErrors[2].newOccurrences).toHaveLength(2)
    expect(options.database.save).toHaveBeenCalledTimes(3)
    expect(options.issueClient.createIssue).toHaveBeenCalledTimes(1)
    expect(options.issueClient.updateIssue).toHaveBeenCalledTimes(2)
    expect(trackedErrors).toMatchSnapshot()
  })

  test('should not track errors with same timestamp', async () => {
    // given
    const options = await initOptions([
      anError('Error 1', 1),
      anError('Error 2', 2),
    ])
    const errors: Error[] = [anError('Error 1', 1), anError('Error 2', 2)]

    // when
    const trackedErrors = await trackErrors(errors, options)
    // then
    expect(trackedErrors).toHaveLength(0)
    expect(options.database.save).toHaveBeenCalledTimes(0)
    expect(options.issueClient.createIssue).toHaveBeenCalledTimes(0)
    expect(options.issueClient.updateIssue).toHaveBeenCalledTimes(0)
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
    const options = await initOptions([], comparator)

    // when
    const trackedErrors = await trackErrors(
      [anError('Error 1 : Arg0'), anError('Error 1 : Arg1')],
      options
    )

    // then
    expect(trackedErrors).toHaveLength(1)
    expect(trackedErrors[0].newOccurrences).toHaveLength(2)
    expect(trackedErrors).toMatchSnapshot()
  })

  test('should use a custom comparator based on an error attribute', async () => {
    // given
    const comparator: Comparator<Error> = (a, b) =>
      (a.myAttribute as number) - (b.myAttribute as number)
    const options = await initOptions([], comparator)

    // when
    const trackedErrors = await trackErrors(
      [
        { ...anError('Error 1'), myAttribute: 1 },
        { ...anError('Error 1'), myAttribute: 2 },
        { ...anError('Error 1'), myAttribute: 1 },
      ],
      options
    )

    // then
    expect(trackedErrors).toHaveLength(2)
    expect(trackedErrors[0].newOccurrences).toHaveLength(2)
    expect(trackedErrors[1].newOccurrences).toHaveLength(1)
    expect(trackedErrors).toMatchSnapshot()
  })

  test('should use a custom federated comparator comparator ', async () => {
    // given
    const comparator: Comparator<Error> = (a, b) => {
      const wordsA = a.message.split(' ')
      const wordsB = b.message.split(' ')
      const diff = difference(wordsA, wordsB)
      const threshold = (wordsA.length - diff.length) / wordsA.length
      return threshold >= 0.8 ? 0 : a.message.localeCompare(b.message)
    }
    const comparatorFederatedErrors: Comparator<FederatedErrors> = (a, b) =>
      b.newOccurrences.some((occ) => comparator(a.newOccurrences[0], occ) === 0)
        ? 0
        : comparator(a.newOccurrences[0], b.newOccurrences[0])
    const options = await initOptions([], undefined, comparatorFederatedErrors)

    // when
    const trackedErrors = await trackErrors(
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
    expect(trackedErrors[1].newOccurrences).toHaveLength(2)
    expect(trackedErrors).toMatchSnapshot()
  })
})
