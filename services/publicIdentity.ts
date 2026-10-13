export const publicName = 'EduVantage';
const candidate = (import.meta.env.VITE_SUPPORT_EMAIL || 'Pragyashukla504@gmail.com').trim();
export const supportEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate) ? candidate : null;
export const publicContactRequired = import.meta.env.PROD && !supportEmail && (typeof location === 'undefined' || location.protocol !== 'file:');
