// src/vendors/arcane-ids.js
// Explicit English-name -> WFCD `uniqueName` table for every Arcane a vendor
// sells. This is what ties a vendor entry to the SAME ownership entry the
// Arcanes tab uses (`owned[uniqueName]`).
//
// All entries below were checked against WFCD warframe-items Arcanes.json
// (the dataset arcanes.js loads). Translated names are never used as IDs.
//
// Adding a vendor Arcane: add one line here (or pass { uid } to arcane() in the
// data file). Until then it falls back to a vendor-local count and the catalog
// logs a warning.

export const ARCANE_UID = {
  "Arcane Battery": "/Lotus/Upgrades/CosmeticEnhancers/Offensive/MaxEnergyForArmor",
  "Arcane Circumvent": "/Lotus/Upgrades/CosmeticEnhancers/Defensive/StealDefensiveStatsOnRoll",
  "Arcane Concentration": "/Lotus/Upgrades/CosmeticEnhancers/Utility/AbilityDurationOnCast",
  "Arcane Expertise": "/Lotus/Upgrades/CosmeticEnhancers/Defensive/ShieldMaxForAbilityStrength",
  "Arcane Ice Storm": "/Lotus/Upgrades/CosmeticEnhancers/Offensive/AbilityPowerOnFreeze",
  "Arcane Persistence": "/Lotus/Upgrades/CosmeticEnhancers/Defensive/MaxDPSTakenForArmour",
  "Arcane Sculptor": "/Lotus/Upgrades/CosmeticEnhancers/Utility/AbilityEfficiencyOnAbilityObjectCreation",
  "Conjunction Voltage": "/Lotus/Upgrades/CosmeticEnhancers/Offensive/SecondaryReloadSpeedAndMultishotOnElectricProc",
  "Melee Afflictions": "/Lotus/Upgrades/CosmeticEnhancers/Offensive/DuplicateStatusOnKnock",
  "Melee Animosity": "/Lotus/Upgrades/CosmeticEnhancers/Offensive/HeavyCritOnRegularMelee",
  "Melee Assimilation": "/Lotus/Upgrades/CosmeticEnhancers/Offensive/HeavyAttackDamageAndShieldOnShieldBreak",
  "Melee Careen": "/Lotus/Upgrades/CosmeticEnhancers/Utility/FreezeEnemiesOnRoll",
  "Melee Exposure": "/Lotus/Upgrades/CosmeticEnhancers/Offensive/CorrosiveMeleePerAbilityCast",
  "Melee Fortification": "/Lotus/Upgrades/CosmeticEnhancers/Offensive/ArmorOnMeleeKill",
  "Melee Influence": "/Lotus/Upgrades/CosmeticEnhancers/Offensive/MeleeProcsSpread",
  "Melee Retaliation": "/Lotus/Upgrades/CosmeticEnhancers/Offensive/MeleeDamageForActiveShields",
  "Melee Vortex": "/Lotus/Upgrades/CosmeticEnhancers/Offensive/PullEnemiesOnMeleeKill",
  "Primary Blight": "/Lotus/Upgrades/CosmeticEnhancers/Offensive/PrimaryHeadshotCritMultOnHeadshot",
  "Primary Bulwark": "/Lotus/Upgrades/CosmeticEnhancers/Offensive/DamageForBonusArmour",
  "Primary Compression": "/Lotus/Upgrades/CosmeticEnhancers/Utility/ConvergeRadialAttackOnAim",
  "Primary Debilitate": "/Lotus/Upgrades/CosmeticEnhancers/Offensive/SplitStatusProcsOnStackedStatusHit",
  "Primary Frostbite": "/Lotus/Upgrades/CosmeticEnhancers/Offensive/PrimaryCritDmgAndMultishotOnColdProc",
  "Primary Overcharge": "/Lotus/Upgrades/CosmeticEnhancers/Offensive/MultishotForMaxEnergy",
  "Secondary Cryogenic": "/Lotus/Upgrades/CosmeticEnhancers/Offensive/SecondaryColdOnPuncture",
  "Secondary Encumber": "/Lotus/Upgrades/CosmeticEnhancers/Utility/ExtraProcOnProc",
  "Secondary Fortifier": "/Lotus/Upgrades/CosmeticEnhancers/Offensive/OverguardSteal",
  "Secondary Irradiate": "/Lotus/Upgrades/CosmeticEnhancers/Offensive/RadialDamageOnMaxRadiationStackHit",
  "Secondary Surge": "/Lotus/Upgrades/CosmeticEnhancers/Offensive/BonusDamageNextShotForCurEnergy",
};
