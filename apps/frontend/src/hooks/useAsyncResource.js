import { useCallback, useEffect, useState } from 'react';

export function useAsyncResource(loader) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requestId, setRequestId] = useState(0);

  const reload = useCallback(() => setRequestId((current) => current + 1), []);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);

    Promise.resolve(loader())
      .then((result) => {
        if (!active) return;
        setData(result);
        setIsLoading(false);
      })
      .catch((loadError) => {
        if (!active) return;
        setError(loadError);
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [loader, requestId]);

  return { data, error, isLoading, reload };
}
