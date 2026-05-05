export type HomeAwayPref = "home" | "away" | "either";

export interface VenueSchool {
  name: string;
  address: string | null;
  city?: string | null;
  state?: string | null;
}

export interface ResolveVenueInput {
  pref: HomeAwayPref;
  slotVenue: string | null;
  coachSchool: VenueSchool;
  requesterSchool?: VenueSchool | null;
}

export interface ResolvedVenue {
  /** Human-readable string for display (e.g. "At Memorial Stadium"). */
  display: string;
  /** Can the requester edit the venue in the request modal? */
  editable: boolean;
  /** Suggested value to prefill the input with (blank for "suggest your own"). */
  prefill: string;
  /** True when the displayed venue is the school's street address fallback (not an explicit venue). */
  isSchoolAddressFallback: boolean;
  /** The string to persist as requests.venue when the requester hasn't edited the prefill. */
  resolvedValue: string;
}

const addressOf = (s?: VenueSchool | null): string => {
  if (!s) return "";
  const parts = [s.address, s.city, s.state].filter(Boolean);
  return parts.join(", ");
};

const schoolLabel = (s: VenueSchool): string => {
  const addr = addressOf(s);
  return addr ? `${s.name} — ${addr}` : s.name;
};

export function resolveVenue(input: ResolveVenueInput): ResolvedVenue {
  const { pref, slotVenue, coachSchool, requesterSchool } = input;
  const trimmed = slotVenue?.trim() || null;

  if (pref === "home") {
    if (trimmed) {
      return {
        display: `At ${trimmed}`,
        editable: false,
        prefill: trimmed,
        isSchoolAddressFallback: false,
        resolvedValue: trimmed,
      };
    }
    const fallback = schoolLabel(coachSchool);
    return {
      display: `At ${fallback}`,
      editable: false,
      prefill: fallback,
      isSchoolAddressFallback: true,
      resolvedValue: fallback,
    };
  }

  if (pref === "away") {
    if (trimmed) {
      return {
        display: `Away — proposed at ${trimmed}`,
        editable: true,
        prefill: trimmed,
        isSchoolAddressFallback: false,
        resolvedValue: trimmed,
      };
    }
    const fallback = requesterSchool ? schoolLabel(requesterSchool) : "";
    return {
      display: fallback ? `Away — at ${fallback}` : "Away — TBD",
      editable: true,
      prefill: fallback,
      isSchoolAddressFallback: Boolean(fallback),
      resolvedValue: fallback,
    };
  }

  // either
  if (trimmed) {
    return {
      display: `Suggested: ${trimmed}`,
      editable: true,
      prefill: trimmed,
      isSchoolAddressFallback: false,
      resolvedValue: trimmed,
    };
  }
  return {
    display: "Venue TBD",
    editable: true,
    prefill: "",
    isSchoolAddressFallback: false,
    resolvedValue: "",
  };
}

/** Normalize the string saved into requests.venue (trim, collapse empties to null-ish sentinel). */
export const normalizeVenue = (v: string): string => v.trim();
