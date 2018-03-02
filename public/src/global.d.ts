declare const OneDrive: any;
declare const firebaseui: any;
declare const firebase: any;

interface Element {
  mozRequestFullScreen(): Promise<void>;
}

interface Document {
  mozExitFullScreen(): Promise<void>;
}
