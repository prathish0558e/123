/**
 * Single source of truth for the studio identity used across the site UI.
 * (Class pricing stays in backend/data/pricing.js — served by /api/pricing.)
 */
export const COMPANY = {
  name: "TCT Fashion Hub",
  tagline: "Where Threads Meet Tradition",
  founded: 2021,
  phone: "+91 93848 46922",
  phoneRaw: "+919384846922",
  whatsapp: "919384846922",
  email: "tctfashionhub@gmail.com",
  address:
    "No. 215, Second Floor, Shakthi Nagar, Near ICICI Bank Ganapathy, Coimbatore - 641006.",
  addressShort: "Ganapathy, Coimbatore",
  hours: "Mon – Sat · 10:00 AM – 7:00 PM",
  mapsLink: "https://maps.app.goo.gl/RSYcKT7v23LzfoiL7",
  mapEmbed:
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d62652.13282285873!2d76.97595559603275!3d11.056739248833322!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ba8fca8ea954ccd%3A0x6d79791fad302083!2sTrend%20Code%20Technology!5e0!3m2!1sen!2sin!4v1790412466349!5m2!1sen!2sin",
  socials: [
    {
      label: "Instagram",
      icon: "bi-instagram",
      url: "https://instagram.com/tct_fashion_hub?stkn=dmRicXg3bTZnaXJt",
    },
    {
      label: "Facebook",
      icon: "bi-facebook",
      url: "https://facebook.com/share/18dZzFyrWt",
    },
    {
      label: "YouTube",
      icon: "bi-youtube",
      url: "https://www.youtube.com/@TctFashionhub",
    },
  ],
};

export const LEADERSHIP = [
  {
    name: "Bharath T",
    role: "Chief Executive Officer (CEO)",
    image: "/images/leadership/ceo-bharath.png",
    instagram: "https://www.instagram.com/bharath_heeran/",
    bio: "Bharath sets the vision and the direction of the studio — which crafts we teach, how the academy grows, and how every student is looked after from the first enquiry to the final certificate. He believes craft education in Coimbatore deserves the same polish as the finest boutique, and that learning a handmade skill should always feel like a gift.",
  },
  {
    name: "Mohanapriya K",
    role: "Managing Director (MD)",
    image: "/images/leadership/md-mohanapriya.jpeg",
    instagram: "https://www.instagram.com/priyadcrush05/",
    bio: "Mohanapriya runs the studio day to day — curriculum, mentor schedules, and the starter-kit programme that greets every new student. A craftsperson at heart, she keeps each batch deliberately small so that no learner is ever left without a guiding hand, and every technique is practised until it feels effortless.",
  },
];

export const CRAFTS = [
  "Tailoring",
  "Embroidery",
  "Aari Work",
  "Jewellery Making",
  "Saree Pre-Pleating",
  "Mehndi",
  "Resin Art",
];

export const STATS = [
  { value: 500, suffix: "+", label: "Students trained" },
  { value: 7, suffix: "", label: "Crafts taught" },
  { value: 20, suffix: "+", label: "Kit gifts given monthly" },
  { value: 2021, suffix: "", label: "Serving Coimbatore since", plain: true },
];

export const VALUES = [
  [
    "bi-people",
    "Small batches",
    "Every student gets personal attention, every session.",
  ],
  [
    "bi-award",
    "Certified courses",
    "Finish with a certificate and a showcase of your work.",
  ],
  [
    "bi-gift",
    "Kit gifts included",
    "Every class begins with a starter kit, on the house.",
  ],
  [
    "bi-lightbulb",
    "Modern + traditional",
    "Time-honoured craft taught with contemporary flair.",
  ],
];

export const TESTIMONIALS = [
  {
    name: "Priya R.",
    role: "Student since 2026",
    quote:
      "The teachers make every technique feel effortless — I joined for tailoring and stayed for aari work.",
  },
  {
    name: "Divya S.",
    role: "Embroidery & Jewellery",
    quote:
      "Small batches make all the doubt go away. The starter kit meant I could practise at home from day one.",
  },
  {
    name: "Kavitha M.",
    role: "Saree Pre-Pleating",
    quote:
      "One month and I was draping sarees for family functions like a professional. Worth every rupee.",
  },
  {
    name: "Anitha K.",
    role: "Signature Combo student",
    quote:
      "All seven crafts in one combo — the certificate showcase at the end made my parents so proud.",
  },
];
