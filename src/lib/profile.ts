export interface ProfileData {
  dateOfBirth?: string | Date | null;
  status?: string | null;
  faculty?: string | null;
  university?: string | null;
  doctorType?: string | null;
  sector?: string | null;
  establishment?: string | null;
}

export interface ProfileIncompleteResult {
  complete: false;
  missingFields: string[];
}

export type ProfileCheckResult = { complete: true } | ProfileIncompleteResult;

const STATUS_INTERNAL = ["Étudiant Interne", "Enseignant Universitaire", "Administratif"];

export function checkProfileComplete(profile: ProfileData): ProfileCheckResult {
  const missing: string[] = [];

  if (!profile.dateOfBirth) missing.push("dateOfBirth");

  if (!profile.status) {
    missing.push("status");
    return { complete: false, missingFields: missing };
  }

  if (STATUS_INTERNAL.includes(profile.status)) {
    if (!profile.faculty) missing.push("faculty");
  } else if (profile.status === "Étudiant Externe") {
    if (!profile.university) missing.push("university");
  } else if (profile.status === "Médecin") {
    if (!profile.doctorType) missing.push("doctorType");
    if (!profile.sector) missing.push("sector");
    if (profile.sector === "Public" && !profile.establishment) missing.push("establishment");
  }

  if (missing.length > 0) return { complete: false, missingFields: missing };
  return { complete: true };
}
