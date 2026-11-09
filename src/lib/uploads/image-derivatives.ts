// Derivative specs, watermark settings and key helpers live in derivative-render.mjs so the
// upload pipeline and scripts/regenerate-derivatives.mjs share one implementation.
export {
  COPYRIGHT_METADATA,
  DERIVATIVE_CACHE_CONTROL,
  DERIVATIVE_VERSION,
  IMAGE_DERIVATIVES,
  LARGE_MAX_DIMENSION,
  WATERMARK,
  baseKeyFromOriginalKey,
  buildCopyrightExif,
  currentDerivativeKeys,
  derivativeKey,
  getFitInsideDimensions,
  getWatermarkLayout,
  getWatermarkText,
  previousDerivativeKeys,
  renderAllDerivatives,
  renderDerivative,
  renderWatermarkOverlay,
} from "./derivative-render.mjs";

export type ImageDerivativeName = keyof typeof import("./derivative-render.mjs").IMAGE_DERIVATIVES;
