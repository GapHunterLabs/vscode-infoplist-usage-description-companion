# Info.plist Usage Description Companion (VS Code)

Cross-checks Swift/Objective-C imports (`CoreLocation`, `Contacts`,
`Photos`, camera/microphone, and more) against the required
`NS*UsageDescription` keys in `Info.plist` — a common, real cause of
App Store Connect rejection. No data leaves your editor.

**v0.1, new niche.** Not a port from the Gap Hunter Labs IntelliJ-
family catalog. Evidence: only generic plist editors exist (`Plist
Editor`, `Binary Plist`) — none cross source code against Apple's
required usage-description keys.

## What it does

Scans every `.swift`/`.m`/`.mm` file in the workspace for a curated
set of sensitive-API signals (location, contacts, photo library,
calendars/reminders, HealthKit, Bluetooth, speech recognition, Face
ID, Apple Music, motion, camera, microphone) and checks your
`Info.plist` for the matching `NS*UsageDescription` key. A used API
with no corresponding key gets a warning on `Info.plist`. Re-scans
automatically on save of any Swift/Obj-C file or `Info.plist`, or on
demand via `Info.plist Usage Description Companion: Rescan`.

**v0.1 scope, honestly noted:** detection is import/text-based, not
real symbol resolution. Camera vs. microphone both go through the
same `AVFoundation` import, so those two use a text-proximity
heuristic (`AVCaptureDevice` near `.video` or `.audio`) instead of the
import alone — a real, documented approximation, not full call-site
analysis.

## Privacy

See [PRIVACY.md](PRIVACY.md) — zero network calls, everything runs
against files already in your workspace.

## Development

```bash
npm install
npm run compile   # or: npm run watch
npm test
```

To build an installable package without publishing:

```bash
npx @vscode/vsce package
```

## License

Apache License 2.0 — see [LICENSE](LICENSE).
