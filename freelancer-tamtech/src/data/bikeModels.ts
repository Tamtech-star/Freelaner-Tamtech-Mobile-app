import type { ImageSourcePropType } from "react-native"

export type BikeHotspot = {
  id: "motor" | "suspension" | "rear" | "dashboard" | "comfort"
  title: string
  description: string
  points: string[]
  label: string
  top: `${number}%`
  left: `${number}%`
}

export type BikeModel = {
  id: string
  name: string
  tagline: string
  price: string
  image: ImageSourcePropType
  colors: Array<{
    id: "blue" | "yellow" | "green" | "red"
    name: string
    swatch: string
    available: boolean
    images: ImageSourcePropType[]
  }>
  hotspots: BikeHotspot[]
}

export const BIKE_MODELS: BikeModel[] = [
  {
    id: "ekon-450-m1v3",
    name: "EKON450 M1V3",
    tagline: "Built for practical power, intelligent control, and everyday confidence.",
    price: "KES 130,000 cash price",
    image: require("../../assets/images/bikes/bike1.jpeg"),
    colors: [
      {
        id: "blue",
        name: "Blazing Blue",
        swatch: "#2387FF",
        available: true,
        images: [require("../../assets/images/bikes/blue.jpeg")],
      },
      {
        id: "yellow",
        name: "Fiery Yellow",
        swatch: "#FFD42A",
        available: false,
        images: [],
      },
      {
        id: "green",
        name: "Gladiator Green",
        swatch: "#58A53C",
        available: true,
        images: [
          require("../../assets/images/bikes/green.jpeg"),
          require("../../assets/images/bikes/green2.jpeg"),
          require("../../assets/images/bikes/green3.jpeg"),
        ],
      },
      {
        id: "red",
        name: "Raging Red",
        swatch: "#D63B38",
        available: true,
        images: [
          require("../../assets/images/bikes/red.jpeg"),
          require("../../assets/images/bikes/red2.jpeg"),
        ],
      },
    ],
    hotspots: [
      {
        id: "motor",
        title: "High-Efficiency Mid-Drive Motor",
        description: "The heart of the EKON450 M1V3 combines strong response with efficient everyday performance.",
        points: [
          "Up to 9 kW of power with 260+ Nm of torque.",
          "0–40 km/h in under 4 seconds.",
          "95% operating efficiency for load carrying and gradeability.",
          "Up to 35% more affordable to run than a petrol bike.",
        ],
        label: "MOTOR",
        top: "63%",
        left: "43%",
      },
      {
        id: "suspension",
        title: "Rugged Suspension & Braking",
        description: "Protected front suspension and controlled braking are ready for mixed urban and rough-road conditions.",
        points: [
          "130 mm drum brakes reduce braking distance by 15%.",
          "31 mm front forks with rubber bellows protect the shock absorbers.",
          "Up to 200 mm of high ground clearance.",
        ],
        label: "FRONT",
        top: "66%",
        left: "16%",
      },
      {
        id: "rear",
        title: "Hybrid Tyres & Adjustable Shocks",
        description: "The rear setup balances traction, comfort, and practical battery-swapping convenience.",
        points: [
          "17-inch hybrid tubeless tyres for wet and rough roads.",
          "Five-step adjustable rear shocks.",
          "Battery swap time under 2 minutes.",
        ],
        label: "REAR",
        top: "70%",
        left: "78%",
      },
      {
        id: "dashboard",
        title: "Smart IoT Control Center",
        description: "The rider-focused dashboard brings charging, security, tracking, and software intelligence together.",
        points: [
          "Colour LED display with built-in USB charging.",
          "Remote immobilisation and motor-lock control.",
          "Vehicle and battery tracking.",
          "Over-the-air software updates.",
        ],
        label: "DASH",
        top: "29%",
        left: "52%",
      },
      {
        id: "comfort",
        title: "Enhanced Comfort & Storage",
        description: "More useful storage and a thicker seat improve the experience for both rider and pillion.",
        points: [
          "16L integrated storage tank.",
          "Seat is 130 mm thicker, a 73% increase.",
          "Improved ergonomics to reduce fatigue on longer rides.",
        ],
        label: "COMFORT",
        top: "43%",
        left: "54%",
      },
    ],
  },
]
