type SuccessResult<T> = readonly [T, null]
type ErrorResult<E> = readonly [null, E]
type Result<T, E = Error> = SuccessResult<T> | ErrorResult<E>

const tryCatch = async <T, E = Error>(promise: Promise<T>, onFinally?: () => void): Promise<Result<T, E>> => {
  try {
    const data = await promise
    return [data, null]
  } catch (error) {
    return [null, error as E] as const
  } finally {
    onFinally?.()
  }
}

export default tryCatch