
export const FAMILY_DATA = {
  name: "The Smiths",
  members: [
    { id: "1", name: "Alex", role: "Parent", avatar: "A" },
    { id: "2", name: "Jordan", role: "Parent", avatar: "J" },
    { id: "3", name: "Riley", role: "Dependent", avatar: "R" },
  ],
  currentBudget: 1250.00,
  currentSavings: 15400.00,
  safeToSpendDaily: 42.50,
  healthScores: {
    adherence: 88,
    savingsRate: 72,
    emergencyReadiness: 95,
    impulseRatio: 12,
  },
  goals: [
    { name: "Summer Vacation", targetAmount: 3000, currentAmount: 2100, deadline: "2024-07-01" },
    { name: "Emergency Fund", targetAmount: 20000, currentAmount: 15400, deadline: "2025-01-01" },
  ]
};

export const RECENT_TRANSACTIONS = [
  { id: "1", description: "Grocery Store", amount: 142.50, category: "Groceries", date: "2024-05-20", member: "Alex" },
  { id: "2", description: "Coffee Shop", amount: 4.50, category: "Dining", date: "2024-05-20", member: "Jordan" },
  { id: "3", description: "Monthly Netflix", amount: 15.99, category: "Entertainment", date: "2024-05-19", member: "System" },
];
