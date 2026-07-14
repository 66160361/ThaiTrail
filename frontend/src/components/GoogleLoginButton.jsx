import { useEffect, useRef } from 'react';

const GOOGLE_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
let scriptPromise = null;

function loadGoogleScript() {
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector(`script[src="${GOOGLE_SCRIPT_URL}"]`);
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(), { once: true });
        existingScript.addEventListener('error', () => reject(new Error('Failed to load Google script')), {
          once: true,
        });
        return;
      }

      const script = document.createElement('script');
      script.src = GOOGLE_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google script'));
      document.head.appendChild(script);
    });
  }

  return scriptPromise;
}

function GoogleLoginButton({ clientId, onCredential, onError, width = 320 }) {
  const buttonContainerRef = useRef(null);

  useEffect(() => {
    let isCancelled = false;

    if (!clientId) {
      onError?.('Missing VITE_GOOGLE_CLIENT_ID');
      return undefined;
    }

    loadGoogleScript()
      .then(() => {
        if (isCancelled || !buttonContainerRef.current) {
          return;
        }

        if (!window.google?.accounts?.id) {
          onError?.('Google Identity Services is not available');
          return;
        }

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (!response?.credential) {
              onError?.('Google did not return a credential');
              return;
            }
            onCredential?.(response.credential);
          },
        });

        buttonContainerRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(buttonContainerRef.current, {
          type: 'standard',
          theme: 'filled_blue',
          size: 'large',
          shape: 'pill',
          text: 'signin_with',
          logo_alignment: 'left',
          width,
        });
      })
      .catch((error) => {
        if (!isCancelled) {
          onError?.(error.message || 'Unable to initialize Google sign-in');
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [clientId, onCredential, onError, width]);

  return <div ref={buttonContainerRef} />;
}

export default GoogleLoginButton;