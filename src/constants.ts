export const STATUS = {
  YARD: "yard",
  CUTTING: "cutting",
  UNPOLISHED: "unpolished_stock",
  POLISHING: "polishing",
  FINISHED: "finished",          // Just came out of the polishing machine
  READY_TO_SELL: "ready_to_sell", // Logged with thickness/finish details, standing in showroom
  SOLD: "sold",
} as const;