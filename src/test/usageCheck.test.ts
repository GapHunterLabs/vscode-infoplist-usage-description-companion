import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findUsedApiSignals, parsePlistKeys, findMissingUsageDescriptions } from '../usageCheck';

test('findUsedApiSignals detects CoreLocation import', () => {
  const signals = findUsedApiSignals('import CoreLocation\nlet manager = CLLocationManager()');
  assert.ok(signals.has('Location'));
});

test('findUsedApiSignals detects Contacts import', () => {
  const signals = findUsedApiSignals('import Contacts');
  assert.ok(signals.has('Contacts'));
});

test('findUsedApiSignals detects camera usage via AVCaptureDevice + .video', () => {
  const signals = findUsedApiSignals('AVCaptureDevice.requestAccess(for: .video) { granted in }');
  assert.ok(signals.has('Camera'));
  assert.ok(!signals.has('Microphone'));
});

test('findUsedApiSignals detects microphone usage via AVCaptureDevice + .audio', () => {
  const signals = findUsedApiSignals('AVCaptureDevice.requestAccess(for: .audio) { granted in }');
  assert.ok(signals.has('Microphone'));
  assert.ok(!signals.has('Camera'));
});

test('findUsedApiSignals returns empty for a file with no sensitive API usage', () => {
  const signals = findUsedApiSignals('import Foundation\nlet x = 1');
  assert.equal(signals.size, 0);
});

test('parsePlistKeys extracts every <key> entry', () => {
  const plist = `<plist><dict>
    <key>NSCameraUsageDescription</key>
    <string>We use the camera to scan documents.</string>
    <key>CFBundleName</key>
    <string>MyApp</string>
  </dict></plist>`;
  const keys = parsePlistKeys(plist);
  assert.ok(keys.has('NSCameraUsageDescription'));
  assert.ok(keys.has('CFBundleName'));
  assert.equal(keys.size, 2);
});

test('findMissingUsageDescriptions flags Location when no plist key covers it', () => {
  const missing = findMissingUsageDescriptions(new Set(['Location']), new Set());
  assert.equal(missing.length, 1);
  assert.equal(missing[0].signal, 'Location');
});

test('findMissingUsageDescriptions accepts any of several acceptable keys', () => {
  const missing = findMissingUsageDescriptions(new Set(['Location']), new Set(['NSLocationAlwaysUsageDescription']));
  assert.equal(missing.length, 0);
});

test('findMissingUsageDescriptions reports nothing when all used signals are covered', () => {
  const used = new Set(['Camera', 'Contacts']);
  const covered = new Set(['NSCameraUsageDescription', 'NSContactsUsageDescription']);
  assert.deepEqual(findMissingUsageDescriptions(used, covered), []);
});
