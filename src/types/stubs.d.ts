// Temporary stub type declarations to allow TypeScript to resolve React and React Native modules
// in environments where node_modules are unavailable. Replace with actual @types packages when
// installing dependencies in a full development setup.

declare namespace JSX {
  interface Element {}
  interface ElementClass {}
  interface ElementAttributesProperty {
    props: {};
  }
  interface IntrinsicElements {
    [elemName: string]: any;
  }
  interface IntrinsicAttributes {
    key?: string | number;
  }
}

declare module 'react' {
  export type ReactNode = any;
  export type ReactElement = any;
  export interface FC<P = {}> {
    (props: P & { children?: ReactNode }): ReactElement | null;
  }
  export function useState<T>(initial: T | (() => T)): [T, (value: T) => void];
  export function useEffect(effect: () => void | (() => void), deps?: any[]): void;
  export function useMemo<T>(factory: () => T, deps: any[]): T;
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: any[]): T;
  const React: {
    createElement: (...args: any[]) => ReactElement;
  };
  export default React;
}

declare module 'react-native' {
  export const View: any;
  export const Text: any;
  export const ScrollView: any;
  export const FlatList: any;
  export const Pressable: any;
  export const TouchableOpacity: any;
  export const SafeAreaView: any;
  export const StyleSheet: {
    create: (styles: any) => any;
    hairlineWidth: number;
  };
  export const Dimensions: {
    get: (dim: 'window' | 'screen') => { width: number; height: number };
  };
  export const Platform: {
    OS: string;
    select: (options: Record<string, any>) => any;
  };
}
