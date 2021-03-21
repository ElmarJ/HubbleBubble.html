declare const OneDrive: any;
declare const firebaseui: any;

interface Element {
  mozRequestFullScreen(): Promise<void>;
  webkitRequestFullscreen(): Promise<void>;
}

interface Document {
  mozExitFullScreen(): Promise<void>;
  webkitExitFullscreen(): Promise<void>;
}

declare namespace gapi.auth2 {
  export function getAuthInstance(): any;
}

declare namespace gapi.client {
  export const calendar: any;
  export namespace calendar {
    export type Event = any;
  }
}