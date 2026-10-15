import type { Variants, Transition } from "framer-motion";

const softEase: Transition["ease"] = [0.25, 0.1, 0.25, 1];

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: softEase },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.5, ease: softEase },
  },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: softEase },
  },
};

export const cardHover: Variants = {
  rest: { y: 0, boxShadow: "0 0 0 rgba(0,0,0,0)" },
  hover: {
    y: -4,
    boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
    transition: { duration: 0.25, ease: softEase },
  },
  tap: { scale: 0.98, transition: { duration: 0.1 } },
};

export const imageZoom: Variants = {
  rest: { scale: 1 },
  hover: { scale: 1.06, transition: { duration: 0.5, ease: softEase } },
};

export const buttonTap: Variants = {
  tap: { scale: 0.97, transition: { duration: 0.1 } },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: softEase },
  },
};

export const pop: Variants = {
  initial: { scale: 1 },
  animate: {
    scale: [1, 1.35, 1],
    transition: { duration: 0.35, ease: softEase },
  },
};
