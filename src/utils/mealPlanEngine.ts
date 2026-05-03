import { GoalType } from '../models/types';

export const FOOD_LIBRARY = {
  HighProtein: ['Chicken Breast', 'Salmon', 'Greek Yogurt', 'Tofu', 'Lean Beef'],
  HighCarb: ['Sweet Potato', 'Brown Rice', 'Oats', 'Quinoa', 'Whole Wheat Pasta'],
  LowCarb: ['Cauliflower', 'Zucchini', 'Broccoli', 'Asparagus', 'Leafy Greens'],
  HealthyFats: ['Avocado', 'Olive Oil', 'Almonds', 'Chia Seeds']
};

export function generateMealPlan(goal: GoalType): string[] {
  let meals: string[] = [];
  
  if (goal === 'Lose Weight') {
    // Prioritize high-protein, low-carb
    meals.push(`Breakfast: ${FOOD_LIBRARY.HighProtein[2]} with a side of ${FOOD_LIBRARY.HealthyFats[2]}`);
    meals.push(`Lunch: Grilled ${FOOD_LIBRARY.HighProtein[0]} with ${FOOD_LIBRARY.LowCarb[2]}`);
    meals.push(`Dinner: Baked ${FOOD_LIBRARY.HighProtein[1]} and ${FOOD_LIBRARY.LowCarb[3]}`);
  } else {
    // Gain Muscle: prioritize high-protein, high-carb
    meals.push(`Breakfast: ${FOOD_LIBRARY.HighCarb[2]} topped with ${FOOD_LIBRARY.HealthyFats[3]} and 4 eggs`);
    meals.push(`Lunch: ${FOOD_LIBRARY.HighProtein[0]} with ${FOOD_LIBRARY.HighCarb[1]} and ${FOOD_LIBRARY.LowCarb[2]}`);
    meals.push(`Dinner: ${FOOD_LIBRARY.HighProtein[4]} steak, ${FOOD_LIBRARY.HighCarb[0]}, and side salad`);
  }
  
  return meals;
}
