import type { ImageSourcePropType } from "react-native"

export type BikeHotspot = {
  id: "engine" | "battery"
  title: string
  description: string
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
  hotspots: BikeHotspot[]
}

export const BIKE_MODELS: BikeModel[] = [
  {
    id: "ekon-450-m1",
    name: "EKON 450 M1",
    tagline: "Confident torque for the everyday escape.",
    price: "KES 185,000",
    image: require("../../assets/images/bikes/bike1.jpeg"),
    hotspots: [
      {
        id: "engine",
        title: "450cc Power Unit",
        description: "A composed torque curve built for responsive city starts and confident open-road cruising.",
        label: "POWER",
        top: "58%",
        left: "42%",
      },
      {
        id: "battery",
        title: "Smart Electrical Core",
        description: "Protected electrical architecture keeps every ride composed, connected, and ready.",
        label: "CORE",
        top: "67%",
        left: "65%",
      },
    ],
  },
  {
    id: "ekon-450-m2",
    name: "EKON 450 M2",
    tagline: "A sharper silhouette with touring confidence.",
    price: "KES 205,000",
    image: require("../../assets/images/bikes/bike2.jpeg"),
    hotspots: [
      {
        id: "engine",
        title: "High-Output Engine",
        description: "Balanced performance and refinement for riders who want more from every kilometre.",
        label: "POWER",
        top: "56%",
        left: "43%",
      },
      {
        id: "battery",
        title: "Integrated Battery Bay",
        description: "A neatly packaged electrical system supports dependable starts and clean daily operation.",
        label: "CORE",
        top: "69%",
        left: "64%",
      },
    ],
  },
  {
    id: "veo-city",
    name: "VEO CITY",
    tagline: "Light on its feet. Serious about your commute.",
    price: "KES 149,000",
    image: require("../../assets/images/bikes/bike3.jpeg"),
    hotspots: [
      {
        id: "engine",
        title: "Urban Drive System",
        description: "Smooth, predictable response for quick movement through the city and beyond.",
        label: "DRIVE",
        top: "59%",
        left: "40%",
      },
      {
        id: "battery",
        title: "Long-Life Battery",
        description: "Designed around dependable everyday range and simple ownership.",
        label: "RANGE",
        top: "70%",
        left: "63%",
      },
    ],
  },
]
