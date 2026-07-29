export const colors = {
  /* Brand Colors */
  orange: "#E8935E",
  orangeLight: "#F2B892",
  orangeDark: "#D47A45",

  cream: "#FDF3E7",
  creamDark: "#F5E6D0",

  brown: "#5C3A21",
  brownLight: "#7A5233",
  brownDark: "#3D2514",

  jade: "#2E8B7E",
  jadeLight: "#4AA398",
  jadeDark: "#1F6B5F",

  coral: "#E85D4E",
  coralLight: "#F08C7F",
  coralDark: "#D44435",

  /* Neutrals */
  white: "#FFFFFF",
  black: "#000000",
  transparent: "transparent",

  /* Semantic Colors */
  success: "#2E8B7E",
  successLight: "#4AA398",
  error: "#E85D4E",
  errorLight: "#F08C7F",
  warning: "#E8935E",
  warningLight: "#F2B892",
  info: "#2E8B7E",
  infoLight: "#4AA398",
} as const;

export type ColorToken = keyof typeof colors;
