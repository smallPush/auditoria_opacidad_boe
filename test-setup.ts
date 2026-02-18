import { GlobalWindow } from 'happy-dom';

const window = new GlobalWindow();
global.window = window as any;
global.document = window.document as any;
global.navigator = window.navigator as any;
global.HTMLElement = window.HTMLElement as any;
global.Node = window.Node as any;
global.Element = window.Element as any;
global.HTMLMetaElement = window.HTMLMetaElement as any;
global.HTMLHeadElement = window.HTMLHeadElement as any;
