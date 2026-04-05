// orchestrator/src/tee/SecurityRules.ts

export class SecurityRules {
  // Le safety score de base doit etre >= 0.7
  static readonly SAFETY_THRESHOLD = 0.7;

  // Un seul protocole ne peut pas depasser 40% sur la chain courante
  static readonly MAX_PROTOCOL_PCT = 40;

  // Une chain individuelle ne peut pas depasser 50% du capital total géré
  static readonly MAX_CHAIN_PCT = 50;

  // Trésorerie maintenue en buffer sur ARC (10%)
  static readonly BUFFER_PCT = 10;

  // Gain de realloc doit etre strictement superieur a 2x le prix CCTP estimation
  static readonly MIN_REALLOC_GAIN_MULTIPLIER = 2;
}
