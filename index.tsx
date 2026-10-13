
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Android browser chrome and the on-screen keyboard change the visual viewport
// independently of the layout viewport. Keep fixed app flows sized to what is visible.
const updateVisibleHeight = () => {
  const height = window.visualViewport?.height || window.innerHeight;
  document.documentElement.style.setProperty('--visible-height', `${height}px`);
};
updateVisibleHeight();
window.addEventListener('resize', updateVisibleHeight);
window.visualViewport?.addEventListener('resize', updateVisibleHeight);
window.visualViewport?.addEventListener('scroll', updateVisibleHeight);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
