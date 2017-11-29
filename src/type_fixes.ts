/**
 * Fix for TypeScript compiler not correctly recognizing
 * the new addEventListener signature
 *
 * https://github.com/Microsoft/TypeScript/issues/9548
 **/

interface TempEventListenerArgs {
  capture?: boolean;
}

interface TempAddEventListenerArgs extends TempEventListenerArgs {
  passive?: boolean;
  once?: boolean;
}

type TempAddEventListener = (
  type: string,
  listener: (event: Event) => void,
  options?: TempAddEventListenerArgs
) => void;

export {TempAddEventListener}

