import React, { useEffect, useRef, useState } from 'react';
import {
  APILoadingStatus,
  AdvancedMarker,
  Map as GoogleMap,
  Pin,
  useApiLoadingStatus,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { AlertCircle, CheckCircle2, Loader2, Map as MapIcon, MapPin, Search } from 'lucide-react';
import { useAutocompleteSuggestions } from '../hooks/useAutocompleteSuggestions';

export interface VerifiedLocationSelection {
  location: string;
  placeId?: string;
  verified: boolean;
}

interface GoogleLocationFieldProps {
  value: string;
  placeId?: string;
  isVerified: boolean;
  validationError?: string | null;
  mapsAvailable: boolean;
  onChangeLocation: (next: VerifiedLocationSelection) => void;
}

function isQuotaRejection(err: unknown): boolean {
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

const GoogleLocationFieldInner: React.FC<GoogleLocationFieldProps> = ({
  value,
  isVerified,
  validationError,
  onChangeLocation,
}) => {
  const apiStatus = useApiLoadingStatus();
  const placesLib = useMapsLibrary('places');

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [showMapPreview, setShowMapPreview] = useState(false);
  const [coords, setCoords] = useState<google.maps.LatLngLiteral | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const shouldQuery = dropdownOpen && !isVerified && value.trim().length >= 2;
  const { suggestions, isLoading, hasQueried, errorMessage, resetSession } =
    useAutocompleteSuggestions(value, shouldQuery);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!isVerified) {
      setCoords(null);
      setShowMapPreview(false);
    }
  }, [isVerified]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value;
    setDetailError(null);
    setDropdownOpen(true);
    onChangeLocation({
      location: nextVal,
      placeId: undefined,
      verified: false,
    });
  };

  const handleSuggestionSelect = async (
    suggestion: google.maps.places.AutocompleteSuggestion
  ) => {
    if (!placesLib || !suggestion.placePrediction) return;

    setFetchingDetails(true);
    setDetailError(null);

    try {
      const place = suggestion.placePrediction.toPlace();
      await place.fetchFields({
        fields: ['id', 'displayName', 'formattedAddress', 'location'],
      });

      const canonicalLocation =
        place.formattedAddress ||
        place.displayName ||
        suggestion.placePrediction.text.text;

      const latLng = place.location
        ? { lat: place.location.lat(), lng: place.location.lng() }
        : null;

      setCoords(latLng);
      setDropdownOpen(false);
      resetSession();

      onChangeLocation({
        location: canonicalLocation,
        placeId: place.id,
        verified: true,
      });
    } catch (err: unknown) {
      if (isQuotaRejection(err)) {
        window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        setDetailError(
          'Google Maps quota reached while confirming this location.'
        );
      } else {
        setDetailError(
          'Could not verify place details from Google Maps. Please pick another suggestion.'
        );
      }
    } finally {
      setFetchingDetails(false);
    }
  };

  const apiFailed =
    apiStatus === APILoadingStatus.FAILED ||
    apiStatus === APILoadingStatus.AUTH_FAILURE;

  const activeError = validationError || detailError || errorMessage;

  return (
    <div ref={containerRef} className="space-y-1.5 relative">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label
          htmlFor="modal-jd-loc"
          className="block text-xs font-semibold text-[#334155]"
        >
          Location
        </label>

        {isVerified ? (
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#ECFDF5] border border-[#A7F3D0] text-[10px] font-semibold text-[#047857]">
              <CheckCircle2 className="w-3 h-3" />
              Google Maps Verified
            </span>
            {coords && (
              <button
                type="button"
                onClick={() => setShowMapPreview((prev) => !prev)}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#EFF6FF] border border-[#BFDBFE] text-[10px] font-semibold text-[#1E40AF] hover:bg-[#DBEAFE] cursor-pointer"
              >
                <MapIcon className="w-3 h-3" />
                {showMapPreview ? 'Hide Map' : 'Preview Map'}
              </button>
            )}
          </div>
        ) : (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#FEF3C7] border border-[#FCD34D] text-[10px] font-semibold text-[#B45309]">
            Select from Google suggestions
          </span>
        )}
      </div>

      <div className="relative">
        <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          id="modal-jd-loc"
          type="text"
          autoComplete="off"
          required
          value={value}
          onFocus={() => {
            if (!isVerified) setDropdownOpen(true);
          }}
          onChange={handleInputChange}
          placeholder="Search any city, region, or address worldwide (e.g. Delhi, New York, London)..."
          className={`w-full pl-8 pr-8 py-2 text-sm bg-white border rounded-lg text-[#111936] placeholder:text-[#7B849E] focus:outline-none focus:ring-2 ${
            activeError
              ? 'border-[#BE123C] focus:ring-[#BE123C]'
              : isVerified
                ? 'border-[#A7F3D0] focus:ring-[#1D4ED8]'
                : 'border-[#E2E4EC] focus:ring-[#1D4ED8]'
          }`}
        />
        {(isLoading || fetchingDetails) && (
          <Loader2 className="w-3.5 h-3.5 text-[#1D4ED8] animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
        )}

        {/* Google Places Suggestions Dropdown */}
        {dropdownOpen && !isVerified && value.trim().length >= 2 && (
          <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white border border-[#C2C7D6] rounded-lg overflow-hidden max-h-60 overflow-y-auto">
            {apiFailed ? (
              <div className="p-3 text-xs text-[#9F1239] bg-[#FFF1F2] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Google Maps Places API is unavailable right now. Please verify your API key and reload.
                </span>
              </div>
            ) : isLoading ? (
              <div className="p-3 text-xs text-[#64748B] flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1D4ED8]" />
                Searching real Google Maps locations...
              </div>
            ) : suggestions.length > 0 ? (
              <ul role="listbox" aria-label="Google Maps location suggestions" className="divide-y divide-[#E2E4EC]">
                {suggestions.map((suggestion, idx) => {
                  const pred = suggestion.placePrediction;
                  if (!pred) return null;
                  const main = pred.mainText?.text || pred.text.text;
                  const secondary = pred.secondaryText?.text;
                  return (
                    <li key={pred.placeId || idx}>
                      <button
                        type="button"
                        onClick={() => void handleSuggestionSelect(suggestion)}
                        className="w-full text-left px-3 py-2.5 hover:bg-[#EFF6FF] flex items-start gap-2.5 transition-colors cursor-pointer"
                      >
                        <MapPin className="w-4 h-4 text-[#1D4ED8] shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-[#111936] truncate">
                            {main}
                          </div>
                          {secondary && (
                            <div className="text-[11px] text-[#64748B] truncate">
                              {secondary}
                            </div>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
                <li className="px-3 py-1.5 bg-[#FAF9F6] text-[10px] text-[#64748B] flex items-center justify-end">
                  Powered by Google
                </li>
              </ul>
            ) : hasQueried ? (
              <div className="p-3 text-xs text-[#B45309] bg-[#FEF3C7] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  No real location found on Google Maps for &ldquo;{value.trim()}&rdquo;. Please enter an existing city, region, or street address.
                </span>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {activeError && (
        <p className="text-[11px] font-medium text-[#BE123C] flex items-start gap-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{activeError}</span>
        </p>
      )}

      {showMapPreview && coords && (
        <div className="h-[180px] w-full rounded-lg overflow-hidden border border-[#E2E4EC] mt-2">
          <GoogleMap
            mapId="DEMO_MAP_ID"
            center={coords}
            zoom={12}
            gestureHandling="cooperative"
            disableDefaultUI
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            className="w-full h-full"
          >
            <AdvancedMarker position={coords} title={value}>
              <Pin background="#1D4ED8" borderColor="#111936" glyphColor="#FFFFFF" />
            </AdvancedMarker>
          </GoogleMap>
        </div>
      )}
    </div>
  );
};

export const GoogleLocationField: React.FC<GoogleLocationFieldProps> = (props) => {
  if (!props.mapsAvailable) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor="modal-jd-loc"
            className="block text-xs font-semibold text-[#334155]"
          >
            Location
          </label>
          {props.isVerified && props.placeId ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#ECFDF5] border border-[#A7F3D0] text-[10px] font-semibold text-[#047857]">
              <CheckCircle2 className="w-3 h-3" />
              Google Maps Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#F1F5F9] border border-[#CBD5E1] text-[10px] font-medium text-[#475569]">
              <MapPin className="w-3 h-3 text-[#64748B]" />
              Manual Location
            </span>
          )}
        </div>
        <div className="relative">
          <MapPin className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="modal-jd-loc"
            type="text"
            required
            value={props.value}
            onChange={(e) =>
              props.onChangeLocation({
                location: e.target.value,
                placeId: undefined,
                verified: false,
              })
            }
            placeholder="Enter any location worldwide (e.g. Delhi, Kashmir, New York, London)..."
            className={`w-full pl-8 pr-3 py-2 text-sm bg-white border rounded-lg text-[#111936] placeholder:text-[#7B849E] focus:outline-none focus:ring-2 ${
              props.validationError
                ? 'border-[#BE123C] focus:ring-[#BE123C]'
                : 'border-[#E2E4EC] focus:ring-[#1D4ED8]'
            }`}
          />
        </div>
        {props.validationError ? (
          <p className="text-[11px] font-medium text-[#BE123C] flex items-start gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{props.validationError}</span>
          </p>
        ) : (
          <p className="text-[11px] text-[#64748B]">
            Specify any city, region, or country worldwide. (Google Maps verification optional)
          </p>
        )}
      </div>
    );
  }

  return <GoogleLocationFieldInner {...props} />;
};
