import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

/**
 * Flat config. `eslint-config-next` ships native flat configs from v16, so
 * there is no `FlatCompat` shim here.
 */
const config = [
  { ignores: [".next/**", "node_modules/**", "data/**", "next-env.d.ts"] },
  ...coreWebVitals,
  ...typescript,
];

export default config;
