export type StoneCostProfile = {
  name: string;
  family: string;
  hardness: number;
  basePrice: number;
  avgYieldPct: number;
};

export type QuarryCostProfile = {
  name: string;
  region: string;
  hardnessMultiplier: number;
  transportMultiplier: number;
  notes: string;
};

export type MachineCostProfile = {
  id: string;
  label: string;
  hourlyRate: number;
  type: "gangsaw" | "liner";
};

export const STONE_PROFILES: StoneCostProfile[] = [
  { name: "Markino Black", family: "Black", hardness: 1.18, basePrice: 165, avgYieldPct: 62 },
  { name: "Rajasthan Black", family: "Black", hardness: 1.12, basePrice: 145, avgYieldPct: 64 },
  { name: "Pebble Black", family: "Black", hardness: 1.08, basePrice: 135, avgYieldPct: 65 },
  { name: "Coin Black", family: "Black", hardness: 1.08, basePrice: 135, avgYieldPct: 65 },
  { name: "Ash Black", family: "Black", hardness: 1.06, basePrice: 125, avgYieldPct: 66 },
  { name: "Pearl Black", family: "Black", hardness: 1.14, basePrice: 150, avgYieldPct: 63 },
  { name: "Black Galaxy", family: "Black", hardness: 1.2, basePrice: 190, avgYieldPct: 60 },
  { name: "Kotda Black", family: "Black", hardness: 1.1, basePrice: 140, avgYieldPct: 64 },
  { name: "Majestic Black", family: "Black", hardness: 1.16, basePrice: 170, avgYieldPct: 62 },
  { name: "Forest Black", family: "Black", hardness: 1.12, basePrice: 155, avgYieldPct: 63 },
  { name: "Fish Black", family: "Black", hardness: 1.08, basePrice: 130, avgYieldPct: 65 },
  { name: "P-White (Platinum)", family: "White", hardness: 1.04, basePrice: 150, avgYieldPct: 67 },
  { name: "S White", family: "White", hardness: 1, basePrice: 125, avgYieldPct: 68 },
  { name: "Cotton White", family: "White", hardness: 0.98, basePrice: 115, avgYieldPct: 69 },
  { name: "China White", family: "White", hardness: 0.96, basePrice: 110, avgYieldPct: 70 },
  { name: "Alaska White", family: "White", hardness: 1.08, basePrice: 175, avgYieldPct: 64 },
  { name: "Viscon White", family: "White", hardness: 1.06, basePrice: 165, avgYieldPct: 65 },
  { name: "Steel Grey", family: "Grey", hardness: 1.12, basePrice: 145, avgYieldPct: 64 },
  { name: "Armani Grey", family: "Grey", hardness: 1.1, basePrice: 155, avgYieldPct: 64 },
  { name: "Web Grey", family: "Grey", hardness: 1.06, basePrice: 135, avgYieldPct: 66 },
  { name: "Moon White", family: "White", hardness: 1.02, basePrice: 130, avgYieldPct: 68 },
  { name: "Kashmir White", family: "White", hardness: 1.04, basePrice: 145, avgYieldPct: 67 },
  { name: "Crystal Yellow", family: "Yellow", hardness: 1.02, basePrice: 120, avgYieldPct: 68 },
  { name: "Alaska Gold", family: "Gold", hardness: 1.1, basePrice: 180, avgYieldPct: 63 },
  { name: "Alaska Mango", family: "Gold", hardness: 1.12, basePrice: 185, avgYieldPct: 62 },
  { name: "Tiger Skin Gold", family: "Gold", hardness: 1.16, basePrice: 190, avgYieldPct: 61 },
  { name: "Titanium Gold", family: "Gold", hardness: 1.2, basePrice: 210, avgYieldPct: 60 },
  { name: "Imperial Gold", family: "Gold", hardness: 1.14, basePrice: 195, avgYieldPct: 62 },
  { name: "Desert Brown", family: "Brown", hardness: 1.04, basePrice: 125, avgYieldPct: 67 },
  { name: "Z Brown", family: "Brown", hardness: 1.08, basePrice: 135, avgYieldPct: 65 },
  { name: "Brazil Brown", family: "Brown", hardness: 1.14, basePrice: 175, avgYieldPct: 62 },
  { name: "Sindoori Red", family: "Red", hardness: 1.08, basePrice: 145, avgYieldPct: 65 },
  { name: "Kharda Red", family: "Red", hardness: 1.06, basePrice: 130, avgYieldPct: 66 },
  { name: "Ruby Red", family: "Red", hardness: 1.18, basePrice: 190, avgYieldPct: 60 },
  { name: "Lakha Red", family: "Red", hardness: 1.14, basePrice: 170, avgYieldPct: 62 },
  { name: "Rosy Pink", family: "Pink", hardness: 1, basePrice: 110, avgYieldPct: 69 },
  { name: "Chima Pink", family: "Pink", hardness: 1.02, basePrice: 115, avgYieldPct: 68 },
  { name: "Blue Dunes", family: "Blue", hardness: 1.16, basePrice: 210, avgYieldPct: 61 },
  { name: "Jasper Blue", family: "Blue", hardness: 1.18, basePrice: 220, avgYieldPct: 60 },
  { name: "Alaska Pink", family: "Pink", hardness: 1.08, basePrice: 165, avgYieldPct: 64 },
  { name: "Alaska Red", family: "Red", hardness: 1.12, basePrice: 175, avgYieldPct: 63 },
  { name: "Fantasy Brown", family: "Brown", hardness: 1.1, basePrice: 185, avgYieldPct: 63 },
];

export const QUARRY_PROFILES: QuarryCostProfile[] = [
  { name: "Jalore", region: "Rajasthan", hardnessMultiplier: 1.08, transportMultiplier: 1.04, notes: "Usually dense red and brown material." },
  { name: "Chima", region: "Rajasthan", hardnessMultiplier: 1.02, transportMultiplier: 1.02, notes: "Pink material, moderate cutting load." },
  { name: "Kotda", region: "Rajasthan", hardnessMultiplier: 1.1, transportMultiplier: 1.03, notes: "Black material, slightly slower cutting." },
  { name: "Kharda", region: "Rajasthan", hardnessMultiplier: 1.04, transportMultiplier: 1.02, notes: "Red material, average yield." },
  { name: "Lakha", region: "Rajasthan", hardnessMultiplier: 1.12, transportMultiplier: 1.05, notes: "Hard red material, watch blade cost." },
  { name: "Kishangarh Local", region: "Rajasthan", hardnessMultiplier: 1, transportMultiplier: 1, notes: "Default local benchmark." },
  { name: "Bangalore", region: "Karnataka", hardnessMultiplier: 1.16, transportMultiplier: 1.12, notes: "Harder southern material and higher logistics." },
  { name: "Ongole", region: "Andhra Pradesh", hardnessMultiplier: 1.18, transportMultiplier: 1.13, notes: "Hard black material, higher cutting hours." },
  { name: "Imported", region: "Mixed", hardnessMultiplier: 1.2, transportMultiplier: 1.15, notes: "Use until enough session data exists." },
];

export const MACHINE_PROFILES: MachineCostProfile[] = [
  { id: "14-blade", label: "14 Blade Cutter", hourlyRate: 2200, type: "gangsaw" },
  { id: "7-blade", label: "7 Blade Cutter", hourlyRate: 1500, type: "gangsaw" },
  { id: "liner", label: "Liner Polish", hourlyRate: 950, type: "liner" },
];

export function getStoneProfile(stoneType: string) {
  return STONE_PROFILES.find((stone) => stone.name.toLowerCase() === stoneType.trim().toLowerCase());
}

export function getQuarryProfile(quarryName: string) {
  return QUARRY_PROFILES.find((quarry) => quarry.name.toLowerCase() === quarryName.trim().toLowerCase());
}

export function getMachineProfile(machineId: string) {
  return MACHINE_PROFILES.find((machine) => machine.id === machineId);
}

export function getCostProfile(stoneType: string, quarryName: string) {
  const stone = getStoneProfile(stoneType);
  const quarry = getQuarryProfile(quarryName);
  const hardnessMultiplier = Number(((stone?.hardness || 1) * (quarry?.hardnessMultiplier || 1)).toFixed(2));
  const transportMultiplier = quarry?.transportMultiplier || 1;

  return {
    stone,
    quarry,
    hardnessMultiplier,
    transportMultiplier,
    expectedYieldPct: stone?.avgYieldPct || 65,
    basePrice: stone?.basePrice || 0,
  };
}

export function estimateMachineCost(machineId: string, durationMins: number, stoneType: string, quarryName: string) {
  const machine = getMachineProfile(machineId);
  const profile = getCostProfile(stoneType, quarryName);
  const hourlyRate = machine?.hourlyRate || 0;
  const rawCost = (durationMins / 60) * hourlyRate;
  return Math.round(rawCost * profile.hardnessMultiplier);
}

export function money(value: number) {
  return `Rs. ${Math.round(value || 0).toLocaleString("en-IN")}`;
}
