import heroSneakers from "@/assets/hero-sneakers.jpg";
import heroBag from "@/assets/hero-bag.jpg";
import heroWatch from "@/assets/hero-watch.jpg";
import catClothing from "@/assets/cat-clothing.jpg";
import catFootwear from "@/assets/cat-footwear.jpg";
import catAccessories from "@/assets/cat-accessories.jpg";
import catFragrances from "@/assets/cat-fragrances.jpg";
import pWatch from "@/assets/p-watch.png";
import pSneaker from "@/assets/p-sneaker.png";
import pTee from "@/assets/p-tee.png";
import pCap from "@/assets/p-cap.png";
import pSlides from "@/assets/p-slides.png";
import pNikeDunk from "@/assets/p-nike-dunk.png";
import pWatch2 from "@/assets/p-watch2.png";
import pHoodie from "@/assets/p-hoodie.png";
import pTee2 from "@/assets/p-tee2.png";
import pFragrance from "@/assets/p-fragrance.png";
import concierge from "@/assets/concierge.jpg";

export const heroSlides = [
  {
    id: 1,
    tag: "NEW SEASON",
    title: "PREMIUM STYLE.\nORIGINAL ALWAYS.",
    copy: "Curated luxury streetwear & lifestyle pieces from the world's most exclusive brands.",
    image: heroSneakers,
  },
  {
    id: 2,
    tag: "ARRIVING NOW",
    title: "CARRIED BY\nTHE CULTURE.",
    copy: "Handpicked leather goods, sourced globally, delivered nationwide.",
    image: heroBag,
  },
  {
    id: 3,
    tag: "TIMELESS",
    title: "EVERY SECOND\nCOUNTS.",
    copy: "Signature timepieces from icons of horology, ready to ship.",
    image: heroWatch,
  },
];

export const categories = [
  { id: "clothing", name: "Clothing", image: catClothing },
  { id: "footwear", name: "Footwear", image: catFootwear },
  { id: "accessories", name: "Accessories", image: catAccessories },
  { id: "fragrances", name: "Fragrances", image: catFragrances },
];

export const bestSellers = [
  { id: "b1", brand: "G-SHOCK", name: "GM-2100-1AER", price: 200000, image: pWatch },
  { id: "b2", brand: "NIKE", name: "Air Force 1 '07", price: 115000, image: pSneaker },
  { id: "b3", brand: "REPRESENT", name: "Owners Club Tee", price: 65000, image: pTee },
  { id: "b4", brand: "NEW ERA", name: "9Forty Cap", price: 28000, image: pCap },
  { id: "b5", brand: "NIKE", name: "Dunk Low Retro - White Grey", price: 155000, image: pNikeDunk },
];

export const newArrivals = [
  { id: "n1", brand: "AMIRI", name: "MA Pool Slides", price: 165000, image: pSlides },
  { id: "n2", brand: "CASIO", name: "GBD-200-9ER", price: 150000, image: pWatch2 },
  { id: "n3", brand: "DAILY PAPER", name: "Hoodie", price: 65000, image: pHoodie },
  { id: "n4", brand: "AAPE", name: "By A Bathing Ape Tee", price: 55000, image: pTee2 },
  { id: "n5", brand: "NIKE", name: "Air Max 1 '86 OG", price: 145000, image: pSneaker },
  { id: "n6", brand: "CREED", name: "Aventus Eau de Parfum", price: 450000, image: pFragrance },
];

export const conciergeImage = concierge;

export const formatNaira = (n: number) =>
  "₦" + new Intl.NumberFormat("en-NG").format(n);

export type Product = (typeof bestSellers)[number];
