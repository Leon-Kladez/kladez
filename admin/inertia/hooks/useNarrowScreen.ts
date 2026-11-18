import { useEffect, useState } from 'react'

/** «Кладезъ»: узкий экран (телефон «стоя») — меньше 640 px, как граница «sm» в Tailwind. */
export function useNarrowScreen(maxWidth = 639): boolean {
  const query = `(max-width: ${maxWidth}px)`
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = () => setNarrow(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])
  return narrow
}
