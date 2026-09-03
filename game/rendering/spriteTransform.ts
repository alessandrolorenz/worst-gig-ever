/** Fixed-layout sprite centered at a canvas point; only its transform animates. */
export function spriteTransform(
  x: number,
  y: number,
  width: number,
  height: number,
  scale = 1,
  rotation = 0,
) {
  return {
    position: 'absolute' as const,
    left: -width / 2,
    top: -height / 2,
    width,
    height,
    transform: [
      { translateX: x },
      { translateY: y },
      { rotate: `${rotation}rad` },
      { scale },
    ],
  };
}
