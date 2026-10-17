import { useEffect, useRef } from 'react';


export const useAutoRefresh = (
  refreshFn: () => void,
  intervalMs: number = 5000,
) => {
  const savedRefreshFn = useRef(refreshFn);


  useEffect(() => {
    savedRefreshFn.current = refreshFn;
  }, [refreshFn]);


  useEffect(() => {
    const interval = setInterval(() => {
      savedRefreshFn.current();
    }, intervalMs);


    return () => clearInterval(interval);
  }, [intervalMs]);
};