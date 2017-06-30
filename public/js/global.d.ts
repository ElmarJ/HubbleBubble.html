declare const firebaseui: any;
declare const mdc: any;
interface Element {
    mozRequestFullScreen(): Promise<void>;
}

interface Document {
    mozExitFullScreen(): Promise<void>;
}