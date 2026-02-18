import { GlobalWindow } from 'happy-dom';

const window = new GlobalWindow();
global.window = window as any;
global.document = window.document as any;
global.navigator = window.navigator as any;
global.Event = window.Event as any;
global.CustomEvent = window.CustomEvent as any;
global.HTMLElement = window.HTMLElement as any;
global.HTMLInputElement = window.HTMLInputElement as any;
global.HTMLButtonElement = window.HTMLButtonElement as any;
global.HTMLAnchorElement = window.HTMLAnchorElement as any;
global.HTMLDivElement = window.HTMLDivElement as any;
global.HTMLSpanElement = window.HTMLSpanElement as any;
global.Node = window.Node as any;
global.Element = window.Element as any;
global.Text = window.Text as any;
global.requestAnimationFrame = (callback) => setTimeout(callback, 0);
global.cancelAnimationFrame = (id) => clearTimeout(id);

// Mocking translations.ts as it is likely used in components
// Actually, Pagination.tsx doesn't seem to use translations.ts directly,
// it uses a 'label' prop which defaults to "Items".
