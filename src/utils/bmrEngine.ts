/**
 * Calculates BMR using Mifflin-St Jeor equation given weight in KG, height in CM, age, and gender.
 */
export function calculateBMR(weightKG: number, heightCM: number, age: number, gender: 'Male' | 'Female'): number {
  if (!weightKG || !heightCM || heightCM <= 0 || !age) return 0;
  let bmr = (10 * weightKG) + (6.25 * heightCM) - (5 * age);
  if (gender === 'Male') {
      bmr += 5;
  } else {
      bmr -= 161;
  }
  return Math.round(bmr);
}

/**
 * Calculates BMI given weight in KG and height in CM.
 */
export function calculateBMI(weightKG: number, heightCM: number): number {
  if (!weightKG || !heightCM || heightCM <= 0) return 0;
  const heightM = heightCM / 100;
  return Number((weightKG / (heightM * heightM)).toFixed(1));
}

/**
 * Calculates standard target healthy weight ranges given height in CM.
 */
export function getHealthyWeightRange(heightCM: number): { min: number; max: number } {
  if (!heightCM || heightCM <= 0) return { min: 0, max: 0 };
  const heightM = heightCM / 100;
  const min = Number((18.5 * (heightM * heightM)).toFixed(1));
  const max = Number((24.9 * (heightM * heightM)).toFixed(1));
  return { min, max };
}
