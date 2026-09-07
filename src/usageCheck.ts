/**
 * Pure logic -- no `vscode` dependency. New niche (not a port from
 * the Kotlin catalog). Evidence: confirmed absence -- only generic
 * plist editors exist (`Plist Editor`, `Binary Plist`), none cross
 * source code imports against the `NS*UsageDescription` keys Apple
 * requires. A missing usage-description key for an API a shipped app
 * actually uses is one of the most cited causes of real App Store
 * Connect rejection.
 */

// Maps a detection "signal" (not always a 1:1 framework import -- see
// the camera/microphone split below) to the Info.plist key(s) that
// satisfy it. Some signals accept ANY of several keys (e.g. EventKit
// covers both calendar and reminder access; either usage-description
// key present is treated as "covered" in this v0.1, since telling
// which specific EventKit API is used would need real API-call
// parsing, not just import detection).
const REQUIRED_KEYS: Record<string, string[]> = {
  Location: ['NSLocationWhenInUseUsageDescription', 'NSLocationAlwaysAndWhenInUseUsageDescription', 'NSLocationAlwaysUsageDescription'],
  Contacts: ['NSContactsUsageDescription'],
  PhotoLibrary: ['NSPhotoLibraryUsageDescription', 'NSPhotoLibraryAddUsageDescription'],
  Calendars: ['NSCalendarsUsageDescription', 'NSRemindersUsageDescription'],
  Health: ['NSHealthShareUsageDescription', 'NSHealthUpdateUsageDescription'],
  Bluetooth: ['NSBluetoothAlwaysUsageDescription'],
  SpeechRecognition: ['NSSpeechRecognitionUsageDescription'],
  FaceID: ['NSFaceIDUsageDescription'],
  AppleMusic: ['NSAppleMusicUsageDescription'],
  Motion: ['NSMotionUsageDescription'],
  Camera: ['NSCameraUsageDescription'],
  Microphone: ['NSMicrophoneUsageDescription'],
};

const IMPORT_SIGNALS: [RegExp, string][] = [
  [/\bimport\s+CoreLocation\b/, 'Location'],
  [/\bimport\s+Contacts(UI)?\b/, 'Contacts'],
  [/\bimport\s+Photos(UI)?\b/, 'PhotoLibrary'],
  [/\bimport\s+EventKit(UI)?\b/, 'Calendars'],
  [/\bimport\s+HealthKit\b/, 'Health'],
  [/\bimport\s+CoreBluetooth\b/, 'Bluetooth'],
  [/\bimport\s+Speech\b/, 'SpeechRecognition'],
  [/\bimport\s+LocalAuthentication\b/, 'FaceID'],
  [/\bimport\s+MediaPlayer\b/, 'AppleMusic'],
  [/\bimport\s+CoreMotion\b/, 'Motion'],
];

/** Scans one Swift/Objective-C source file's text for API usage
 * signals. Camera vs. microphone are both reachable via AVFoundation
 * (an ambiguous single import), so those two use a text-proximity
 * heuristic on `AVCaptureDevice` + `.video`/`.audio` instead of the
 * import alone -- a real, honestly-noted approximation, not full
 * call-site resolution. */
export function findUsedApiSignals(text: string): Set<string> {
  const signals = new Set<string>();
  for (const [pattern, signal] of IMPORT_SIGNALS) {
    if (pattern.test(text)) signals.add(signal);
  }
  if (/\bAVCaptureDevice\b/.test(text)) {
    if (/\.video\b/.test(text)) signals.add('Camera');
    if (/\.audio\b/.test(text)) signals.add('Microphone');
  }
  return signals;
}

/** Extracts every `<key>Name</key>` entry from a plist's XML text --
 * a simple regex scan, not a real plist/XML parser (v0.1 scope, good
 * enough for the flat key-lookup this check needs). */
export function parsePlistKeys(xmlText: string): Set<string> {
  const keys = new Set<string>();
  for (const match of xmlText.matchAll(/<key>([^<]+)<\/key>/g)) {
    keys.add(match[1]);
  }
  return keys;
}

export interface MissingUsageDescription {
  signal: string;
  acceptableKeys: string[];
}

export function findMissingUsageDescriptions(usedSignals: Set<string>, plistKeys: Set<string>): MissingUsageDescription[] {
  const missing: MissingUsageDescription[] = [];
  for (const signal of usedSignals) {
    const acceptableKeys = REQUIRED_KEYS[signal];
    if (!acceptableKeys) continue;
    const covered = acceptableKeys.some((key) => plistKeys.has(key));
    if (!covered) missing.push({ signal, acceptableKeys });
  }
  return missing;
}
