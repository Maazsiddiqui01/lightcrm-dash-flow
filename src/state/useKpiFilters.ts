import { create } from 'zustand';
import { useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';

export interface KpiFilters {
  dateStart: string; // YYYY-MM-DD
  dateEnd: string;   // YYYY-MM-DD
  focusAreas: string[];
  sectors: string[];
  ownership: string[];
}

interface KpiFiltersStore extends KpiFilters {
  setFilters: (filters: Partial<KpiFilters>) => void;
  resetToDefault: () => void;
}

const getDefaultFilters = (): KpiFilters => {
  const now = new Date();
  const nineMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 9, 1);
  
  return {
    dateStart: nineMonthsAgo.toISOString().split('T')[0],
    dateEnd: now.toISOString().split('T')[0],
    focusAreas: [],
    sectors: [],
    ownership: [],
  };
};

export const useKpiFiltersStore = create<KpiFiltersStore>((set) => ({
  ...getDefaultFilters(),
  setFilters: (filters) => set((state) => ({ ...state, ...filters })),
  resetToDefault: () => set(getDefaultFilters()),
}));

export const useKpiFilters = () => {
  const store = useKpiFiltersStore();
  const [searchParams, setSearchParams] = useSearchParams();

  // Hydrate from URL on mount
  useEffect(() => {
    const urlFilters: Partial<KpiFilters> = {};
    
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const fa = searchParams.get('fa');
    const sector = searchParams.get('sector');
    const ownership = searchParams.get('ownership');

    if (start) urlFilters.dateStart = start;
    if (end) urlFilters.dateEnd = end;
    if (fa) urlFilters.focusAreas = decodeURIComponent(fa).split(',').filter(Boolean);
    if (sector) urlFilters.sectors = decodeURIComponent(sector).split(',').filter(Boolean);
    if (ownership) urlFilters.ownership = decodeURIComponent(ownership).split(',').filter(Boolean);

    if (Object.keys(urlFilters).length > 0) {
      store.setFilters(urlFilters);
    }
  }, []);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (store.dateStart !== getDefaultFilters().dateStart) {
      params.set('start', store.dateStart);
    }
    if (store.dateEnd !== getDefaultFilters().dateEnd) {
      params.set('end', store.dateEnd);
    }
    if (store.focusAreas.length > 0) {
      params.set('fa', encodeURIComponent(store.focusAreas.join(',')));
    }
    if (store.sectors.length > 0) {
      params.set('sector', encodeURIComponent(store.sectors.join(',')));
    }
    if (store.ownership.length > 0) {
      params.set('ownership', encodeURIComponent(store.ownership.join(',')));
    }

    setSearchParams(params, { replace: true });
  }, [store.dateStart, store.dateEnd, store.focusAreas, store.sectors, store.ownership, setSearchParams]);

  return store;
};