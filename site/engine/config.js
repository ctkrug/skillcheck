// Rule configuration: disable a rule or change its severity, without touching
// the rule modules. Config keys on the emitted diagnostic `ruleId` (what users
// see and what `allRuleIds` lists), so it stays agnostic to how rules are wired.
//
// This module is pure (no Node APIs) so the web validator can honor a config too.

import { allRuleIds } from './rules/index.js';
import { SEVERITY } from './diagnostics.js';

const SEVERITIES = new Set([SEVERITY.ERROR, SEVERITY.WARNING, SEVERITY.INFO]);

/**
 * @typedef {Object} Config
 * @property {Object<string, 'on'|'off'|'error'|'warning'|'info'>} rules
 */

/**
 * Validate and normalize a raw config object. Throws a clear error on an unknown
 * rule id or an invalid severity — a bad config should fail loudly, not silently
 * do nothing.
 * @param {*} raw
 * @returns {Config}
 */
export function normalizeConfig(raw) {
  const rules = {};
  if (!raw || typeof raw !== 'object') return { rules };
  if (raw.rules && typeof raw.rules !== 'object') {
    throw new Error('config `rules` must be an object of ruleId → setting');
  }
  for (const [id, setting] of Object.entries(raw.rules || {})) {
    if (!allRuleIds.includes(id)) {
      throw new Error(`unknown rule id in config: "${id}"`);
    }
    if (setting === false || setting === 'off') rules[id] = 'off';
    else if (setting === true || setting === 'on') rules[id] = 'on';
    else if (SEVERITIES.has(setting)) rules[id] = setting;
    else {
      throw new Error(
        `invalid setting for rule "${id}": ${JSON.stringify(setting)} — use off, error, warning, or info`,
      );
    }
  }
  return { rules };
}

/**
 * Apply a normalized config to a diagnostic list: drop disabled rules and
 * override severities. Returns a new array; inputs are not mutated.
 * @param {import('./diagnostics.js').Diagnostic[]} diagnostics
 * @param {Config} config
 * @returns {import('./diagnostics.js').Diagnostic[]}
 */
export function applyConfig(diagnostics, config) {
  if (!config || !config.rules) return diagnostics;
  const out = [];
  for (const d of diagnostics) {
    const setting = config.rules[d.ruleId];
    if (!setting || setting === 'on') {
      out.push(d);
    } else if (setting === 'off') {
      continue;
    } else {
      out.push({ ...d, severity: setting });
    }
  }
  return out;
}
