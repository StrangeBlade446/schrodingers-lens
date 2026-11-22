import { useEffect, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';

export type UseAutocompleteSuggestionsReturn = {
  suggestions: google.maps.places.AutocompleteSuggestion[];
  isLoading: boolean;
  hasQueried: boolean;
  errorMessage: string | null;
  resetSession: () => void;
};

function isQuotaError(err: unknown): boolean {
  const msg = String(
    err instanceof Error ? err.message : typeof err === 'object' && err !== null ? JSON.stringify(err) : err
  ).toUpperCase();
  return (
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('OVER_QUERY_LIMIT') ||
    msg.includes('QUOTA') ||
    msg.includes('429')
  );
}

/**
 * Retrieves real-time place predictions via Places API (New):
 * AutocompleteSuggestion.fetchAutocompleteSuggestions + AutocompleteSessionToken.
 */
export function useAutocompleteSuggestions(
  inputString: string,
  enabled: boolean,
  requestOptions: Partial<google.maps.places.AutocompleteRequest> = {}
): UseAutocompleteSuggestionsReturn {
  const placesLib = useMapsLibrary('places');

  const sessionTokenRef =
    useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  const [suggestions, setSuggestions] = useState<
    google.maps.places.AutocompleteSuggestion[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasQueried, setHasQueried] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = inputString.trim();

    if (!enabled || !placesLib || trimmed.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      if (trimmed.length < 2) {
        setHasQueried(false);
        setErrorMessage(null);
      }
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      const { AutocompleteSessionToken, AutocompleteSuggestion } = placesLib;

      if (!sessionTokenRef.current) {
        sessionTokenRef.current = new AutocompleteSessionToken();
      }

      const request: google.maps.places.AutocompleteRequest = {
        ...requestOptions,
        input: trimmed,
        sessionToken: sessionTokenRef.current,
      };

      setIsLoading(true);
      setErrorMessage(null);

      AutocompleteSuggestion.fetchAutocompleteSuggestions(request)
        .then((res) => {
          if (cancelled) return;
          setSuggestions(res.suggestions ?? []);
          setHasQueried(true);
          setIsLoading(false);
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          setSuggestions([]);
          setHasQueried(true);
          setIsLoading(false);
          if (isQuotaError(err)) {
            window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
            setErrorMessage(
              'Google Maps suggestion quota reached. Please try again shortly.'
            );
          } else {
            setErrorMessage(
              'Unable to verify locations with Google Places right now. Check your connection and try again.'
            );
          }
        });
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [placesLib, inputString, enabled]);

  return {
    suggestions,
    isLoading,
    hasQueried,
    errorMessage,
    resetSession: () => {
      sessionTokenRef.current = null;
      setSuggestions([]);
      setHasQueried(false);
    },
  };
}
