import { difference } from 'lodash'
import { Comparator, Error, trackErrors } from '../src/index'
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
    expect(trackedErrors[0].occurrences).toHaveLength(2)
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
    const comparator: Comparator = (a, b) => {
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
    expect(trackedErrors).toMatchSnapshot()
  })

  test('should use a custom comparator based on an error attribute', async () => {
    // given
    const comparator: Comparator = (a, b) =>
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
    expect(trackedErrors).toMatchSnapshot()
  })
})
