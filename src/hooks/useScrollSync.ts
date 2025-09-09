import { useEffect } from 'react';

export function useScrollSync(topEl: HTMLElement | null, mainEl: HTMLElement | null) {
  useEffect(() => {
    if (!topEl || !mainEl) return;
    
    const onTop = () => { 
      mainEl.scrollLeft = topEl.scrollLeft; 
    };
    const onMain = () => { 
      topEl.scrollLeft = mainEl.scrollLeft; 
    };
    
    topEl.addEventListener('scroll', onTop, { passive: true });
    mainEl.addEventListener('scroll', onMain, { passive: true });
    
    return () => {
      topEl.removeEventListener('scroll', onTop);
      mainEl.removeEventListener('scroll', onMain);
    };
  }, [topEl, mainEl]);
}