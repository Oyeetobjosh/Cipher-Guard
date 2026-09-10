import { useCallback, useEffect, useState } from 'react'

export interface RemoteState<T> {
  data?: T
  loading: boolean
  error?: Error
  refresh: () => Promise<void>
}

export function useRemote<T>(loader: () => Promise<T>, deps: unknown[] = []): RemoteState<T> {
  const [data, setData] = useState<T>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error>()

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(undefined)
    try {
      setData(await loader())
    } catch (reason) {
      setError(reason instanceof Error ? reason : new Error('Unable to load data.'))
    } finally {
      setLoading(false)
    }
    // The caller controls dependency freshness explicitly to avoid accidental
    // re-fetch loops caused by inline loader functions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { data, loading, error, refresh }
}
