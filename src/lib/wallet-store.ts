import { create } from "zustand";
import { persist } from "zustand/middleware";

export type WalletTxn = {
  id: string;
  date: string;
  time: string;
  title: string;
  sub: string;
  type: "Credit" | "Debit";
  amount: number;
  status: "Completed" | "Pending" | "Failed";
};

const seedTxns: WalletTxn[] = [
  { id: "t1", date: "May 25, 2024", time: "10:35 AM", title: "Added to wallet", sub: "Wallet top up", type: "Credit", amount: 25000, status: "Completed" },
  { id: "t2", date: "May 23, 2024", time: "02:15 PM", title: "Payment for Request #ASL123456", sub: "Air Jordan 1 Retro High OG", type: "Debit", amount: 180000, status: "Completed" },
  { id: "t3", date: "May 20, 2024", time: "11:40 AM", title: "Payment for Request #ASL123455", sub: "Louis Vuitton Keepall", type: "Debit", amount: 120000, status: "Completed" },
  { id: "t4", date: "May 18, 2024", time: "09:05 AM", title: "Refund for Request #ASL123454", sub: "Rolex Submariner Date", type: "Credit", amount: 120000, status: "Completed" },
  { id: "t5", date: "May 15, 2024", time: "03:30 PM", title: "Added to wallet", sub: "Wallet top up", type: "Credit", amount: 30000, status: "Completed" },
];

type State = {
  balance: number;
  totalSpent: number;
  txns: WalletTxn[];
  credit: (amount: number, title: string, sub?: string) => void;
  debit: (amount: number, title: string, sub?: string) => boolean;
};

function now() {
  const d = new Date();
  return {
    date: d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
    time: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
  };
}

export const useWallet = create<State>()(
  persist(
    (set, get) => ({
      balance: 25000,
      totalSpent: 325000,
      txns: seedTxns,
      credit: (amount, title, sub = "") => {
        if (amount <= 0) return;
        const { date, time } = now();
        set((s) => ({
          balance: s.balance + amount,
          txns: [
            { id: `t${Date.now()}`, date, time, title, sub, type: "Credit", amount, status: "Completed" },
            ...s.txns,
          ],
        }));
      },
      debit: (amount, title, sub = "") => {
        if (amount <= 0 || get().balance < amount) return false;
        const { date, time } = now();
        set((s) => ({
          balance: s.balance - amount,
          totalSpent: s.totalSpent + amount,
          txns: [
            { id: `t${Date.now()}`, date, time, title, sub, type: "Debit", amount, status: "Completed" },
            ...s.txns,
          ],
        }));
        return true;
      },
    }),
    { name: "asl-wallet" }
  )
);
