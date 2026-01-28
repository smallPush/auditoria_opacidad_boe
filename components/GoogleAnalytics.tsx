import React, { useEffect } from 'react';

declare global {
    interface Window {
        GA_INITIALIZED?: boolean;
    }
}

const GoogleAnalytics: React.FC = () => {
    const gaId = (process.env as any).GOOGLE_ANALYTICS_ID;

    useEffect(() => {
        if (window.GA_INITIALIZED) {
            console.log('📊 Google Analytics: Already initialized via <head> with ID', gaId);
        } else if (gaId) {
            console.log('📊 Google Analytics: ID found but not initialized. Check if it is blocked or misconfigured.');
        } else {
            console.log('📊 Google Analytics: No valid ID found in environment.');
        }
    }, [gaId]);

    return null;
};

export default GoogleAnalytics;
