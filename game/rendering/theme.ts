/**
 * Graybox palette.
 *
 * Deliberately flat and label-like: M4 forbids final art, and the vertical
 * slice is judged on whether the interaction reads, not on how it looks. Every
 * colour here is replaced by an asset in M3/slice 7 without touching gameplay.
 */

export const THEME = {
  letterbox: '#08070c',
  venueWall: '#1b1630',
  venueGlow: '#2e2350',
  stageFloor: '#241d3a',
  crowd: '#120f22',
  crowdHighlight: '#3a2f5c',
  dangerLine: '#ff5064',
  dangerLineSoft: 'rgba(255, 80, 100, 0.25)',

  drumkit: '#2b2038',
  drumShell: '#3d2c4e',
  drumHead: '#d9d2e4',
  cymbal: '#c8a02e',

  bandBody: '#3b3357',
  bandHead: '#5a4f7d',
  vocalistBody: '#b8432f',
  vocalistHead: '#e0a07a',
  vocalistHit: '#e8c547',

  beerBottle: '#7a9c2e',
  beerBottleNeck: '#5d7722',
  beerMug: '#e0a92b',
  beerMugFoam: '#f4ecd8',

  strike: '#f4ecd8',
  burst: '#ffd45e',
  shard: '#9fd4e8',

  hudText: '#f4ecd8',
  hudDim: 'rgba(244, 236, 216, 0.55)',
  integrityFull: '#4fd67f',
  integrityLost: 'rgba(244, 236, 216, 0.18)',
  overlayScrim: 'rgba(8, 7, 12, 0.82)',
  accent: '#ff5064',
} as const;
