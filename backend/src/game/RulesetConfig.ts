import { RulesetConfig } from './types';

export const CLASSIC_DOUBLE_SAR: RulesetConfig = {
  matchFormat: 5,
  tableDirection: 'clockwise',
  callerRotation: 'classic',
  allowRedeal: false,
  allowTeamChat: true,
  allowUndo: false,
  timerSeconds: 30,
  kotEnabled: false,
  beRangaMode: false,
  rankedMode: false,
  botFillEnabled: true,
};

export const RANKED_DOUBLE_SAR: RulesetConfig = {
  ...CLASSIC_DOUBLE_SAR,
  allowTeamChat: false,
  allowUndo: false,
  timerSeconds: 20,
  rankedMode: true,
};

export const CASUAL_DOUBLE_SAR: RulesetConfig = {
  ...CLASSIC_DOUBLE_SAR,
  allowTeamChat: true,
  allowUndo: true,
  timerSeconds: 60,
};

export function buildRuleset(overrides: Partial<RulesetConfig> = {}): RulesetConfig {
  return { ...CLASSIC_DOUBLE_SAR, ...overrides };
}
