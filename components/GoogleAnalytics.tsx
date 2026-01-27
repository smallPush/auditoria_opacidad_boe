import React, { useEffect } from 'react';

const GoogleAnalytics: React.FC = () => {
    const gaId = (process.env as any).GOOGLE_ANALYTICS_ID;

    useEffect(() => {
        if (!gaId || gaId === 'G-XXXXXXXXXX') return;

        // Load GTM script
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
        document.head.appendChild(script);

        // Initialize gtag
        const scriptInit = document.createElement('script');
        scriptInit.innerHTML = `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaId}');
        `;
        document.head.appendChild(scriptInit);

        return () => {
            // Cleanup scripts if component unmounts (though it's usually at root)
            document.head.removeChild(script);
            document.head.removeChild(scriptInit);
        };
    }, [gaId]);

    return null;
};

export default GoogleAnalytics;
