export const B = {
  dark:       '#111111',
  surface:    '#1c1c1e',
  surface2:   '#252527',
  border:     'rgba(255,255,255,0.08)',
  borderMid:  'rgba(255,255,255,0.14)',
  text:       '#ffffff',
  textSec:    'rgba(255,255,255,0.60)',
  textTert:   'rgba(255,255,255,0.30)',
  textQuart:  'rgba(255,255,255,0.15)',
  coral:      '#F07B6B',
  coralDark:  '#d9614f',
  coralLight: 'rgba(240,123,107,0.14)',
  amber:      '#B07830',
  amberDark:  '#7A5008',
  amberLight: 'rgba(176,120,48,0.14)',
  green:      '#5abf82',
  greenDark:  '#2d7a4f',
  greenLight: 'rgba(90,191,130,0.14)',
  blue:       '#4a90d9',
  blueDark:   '#1a4f8a',
  blueLight:  'rgba(74,144,217,0.14)',
}

export const ROCK_COLORS = {
  r1: B.amber,
  r2: B.coral,
  r3: B.green,
  r4: B.blue,
}

export const card = {
  background: B.surface,
  border: `1px solid ${B.border}`,
  borderRadius: 8,
}

export const sectionLabel = {
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: B.textTert,
  marginBottom: 8,
}
