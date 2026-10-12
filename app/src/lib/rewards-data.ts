/** Rewards numbers shared by the Rewards page and the assistant, so both always say the same thing. */

export const POINTS = 2480;

export const TIERS = [
  { name: "Bronze", at: 0, perks: ["1 point per $1 on gift cards", "Monthly coupons"] },
  { name: "Silver", at: 1000, perks: ["Extra 2% off every gift card", "1.5x points on repayments"] },
  { name: "Gold", at: 3000, perks: ["Extra 5% off every gift card", "2x points on everything", "Early access to new coupons"] },
  { name: "Platinum", at: 7500, perks: ["Extra 8% off every gift card", "3x points on everything", "A free $10 gift card every month"] },
] as const;

export const tierOf = (p: number) => [...TIERS].reverse().find((t) => p >= t.at)!;
export const nextTier = (p: number) => TIERS.find((t) => t.at > p);

export const EARN = [
  { t: "Repay an advance in full", pts: 250 },
  { t: "Client payment repays an advance", pts: "scratch card" },
  { t: "Keep a 25% repay share for 30 days", pts: 200 },
  { t: "Spend with your Advance card", pts: "2 per $1" },
  { t: "Buy a gift card", pts: "1 per $1" },
  { t: "Invite a freelancer who repays their first advance", pts: 400 },
] as const;

export const MISSIONS = [
  { id: "m1", t: "Repay 3 advances on time", done: 2, of: 3, pts: 500, reward: "+500 pts" },
  { id: "m2", t: "Get paid by 2 different clients", done: 1, of: 2, pts: 300, reward: "+300 pts" },
  { id: "m3", t: "Spend $100 with your Advance card", done: 64, of: 100, pts: 200, reward: "+200 pts", money: true },
  { id: "m4", t: "Add an invoice to My documents", done: 1, of: 1, pts: 100, reward: "+100 pts" },
  { id: "m5", t: "Invite a freelancer", done: 0, of: 1, pts: 400, reward: "+400 pts and a $10 Brewline card" },
] as const;

/** 100 points = $1 in gift cards. */
export const POINT_VALUE = 0.01;

export const BRAND_INFO = [
  { id: "cartwheel", name: "Cartwheel", cat: "Food", what: "groceries", off: 6 },
  { id: "nimbus", name: "Nimbus Air", cat: "Travel", what: "flights", off: 4 },
  { id: "velo", name: "Velo", cat: "Rides", what: "rides", off: 8 },
  { id: "pixelhaus", name: "Pixelhaus", cat: "Fun", what: "games", off: 10 },
  { id: "brewline", name: "Brewline", cat: "Food", what: "coffee", off: 12 },
  { id: "reelhouse", name: "Reelhouse", cat: "Fun", what: "cinema", off: 7 },
  { id: "forkful", name: "forkful", cat: "Food", what: "food delivery", off: 9 },
  { id: "stackd", name: "Stackd", cat: "Learning", what: "books and courses", off: 5 },
] as const;

export type OwnedCard = { id: string; brand: string; amount: number; left: number; code: string; pin: string; at: string };
export const OWNED_KEY = "advance:giftcards";
export const OWNED_START: OwnedCard[] = [
  { id: "o1", brand: "brewline", amount: 25, left: 18.4, code: "BRWL-7KQ2-M9XA-4TZP", pin: "4817", at: "Sep 28" },
  { id: "o2", brand: "velo", amount: 50, left: 50, code: "VELO-H3RN-2WQ8-KD6J", pin: "2290", at: "Oct 6" },
];
