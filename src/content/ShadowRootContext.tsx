import { createContext, useContext } from 'react';

interface ShadowRootContextValue {
  container: HTMLElement | null;
}

export const ShadowRootContext = createContext<ShadowRootContextValue>({
  container: null,
});

export function useShadowRoot() {
  return useContext(ShadowRootContext);
}
