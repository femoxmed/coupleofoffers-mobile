import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage, persist } from 'zustand/middleware';

type SearchState = {
  query: string;
  setQuery: (query: string) => void;
  clear: () => void;
};

export const useSearchStore = create<SearchState>()(persist((set) => ({
  query: '',
  setQuery: (query) => set({ query }),
  clear: () => set({ query: '' }),
}), { name: 'coo-search-state', storage: createJSONStorage(() => AsyncStorage) }));
