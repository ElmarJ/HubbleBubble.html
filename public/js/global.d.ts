declare const firebaseui: any;
interface Element {
    mozRequestFullScreen(): Promise<void>;
}

interface Document {
    mozExitFullScreen(): Promise<void>;
}