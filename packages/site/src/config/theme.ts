import type { DefaultTheme } from 'styled-components';
import { createGlobalStyle } from 'styled-components';

const breakpoints = ['600px', '768px', '992px'];

/**
 * Peer brand values, mirrored from `@zkp2p/brand` (the Figma-derived source of
 * truth in the clients monorepo). This site is a standalone Yarn workspace and
 * cannot depend on that package, so the tokens it uses are copied verbatim
 * rather than approximated.
 *
 * Inter carries all text. Peer's headline face, PP Valve, is licensed but has
 * no stable public URL to reference from this repository, so it is not used
 * here yet; headlines use Inter SemiBold uppercase instead.
 */
const brand = {
  black: '#000000',
  richBlack: '#181818',
  obsidian: '#101010',
  white: '#FFFFFF',
  lightGrey: '#EEEEEE',
  grey: '#9A9A9A',
  placeholder: '#6C757D',
  borderDark: '#383838',
  borderLight: '#EEEEEE',
  borderCardLight: '#C9C9C9',
  igniteYellow: '#FFE500',
  igniteRed: '#FF3A33',
  error: '#FF4040',
  errorAlt: '#DF2E2D',
  success: '#4BB543',
};

/**
 * The IGNITE gradient. The brand book reserves it for primary calls to action,
 * so it appears on exactly one control family here and nowhere else.
 */
export const igniteGradient = `linear-gradient(270deg, ${brand.igniteYellow} 0%, ${brand.igniteRed} 100%)`;
export const igniteGradientHover = `linear-gradient(90deg, ${brand.igniteYellow} 0%, ${brand.igniteRed} 100%)`;

/**
 * Common theme properties.
 */
const theme = {
  fonts: {
    headline: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
    default: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif`,
    code: 'ui-monospace,Menlo,Monaco,"Cascadia Mono","Segoe UI Mono","Roboto Mono","Oxygen Mono","Ubuntu Monospace","Source Code Pro","Fira Mono","Droid Sans Mono","Courier New", monospace',
  },
  // The root font size is 62.5%, so 1rem = 10px and these read as pixels.
  fontSizes: {
    heading: '4.8rem', // brand desktop H4
    mobileHeading: '3.2rem', // brand mobile H4
    title: '2.4rem',
    large: '2rem',
    text: '1.6rem', // brand Body3
    small: '1.4rem', // brand Sub2 / label
  },
  radii: {
    default: '2.4rem', // brand xl - cards and panels
    button: '1rem', // brand md - buttons and inputs
    inner: '1.6rem', // brand lg - rows nested inside a panel
    pill: '999px',
  },
  breakpoints,
  mediaQueries: {
    small: `@media screen and (max-width: ${breakpoints[0] as string})`,
    medium: `@media screen and (min-width: ${breakpoints[1] as string})`,
    large: `@media screen and (min-width: ${breakpoints[2] as string})`,
  },
  shadows: {
    default: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    button: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  },
};

/**
 * Light theme color properties.
 */
export const light: DefaultTheme = {
  colors: {
    background: {
      default: brand.white,
      alternative: brand.lightGrey,
      inverse: brand.black,
    },
    icon: {
      default: brand.black,
      alternative: brand.grey,
    },
    text: {
      default: brand.black,
      muted: brand.placeholder,
      alternative: brand.obsidian,
      inverse: brand.white,
    },
    border: {
      default: brand.borderCardLight,
      subtle: brand.borderLight,
    },
    card: {
      default: brand.white,
    },
    error: {
      default: brand.errorAlt,
      alternative: brand.errorAlt,
      muted: 'rgba(223, 46, 45, 0.08)',
    },
    success: {
      default: brand.success,
    },
  },
  ...theme,
};

/**
 * Dark theme color properties
 */
export const dark: DefaultTheme = {
  colors: {
    background: {
      default: brand.black,
      alternative: brand.richBlack,
      inverse: brand.white,
    },
    icon: {
      default: brand.white,
      alternative: brand.grey,
    },
    text: {
      default: brand.white,
      muted: brand.grey,
      alternative: brand.lightGrey,
      inverse: brand.black,
    },
    border: {
      default: brand.borderDark,
      subtle: '#262626',
    },
    card: {
      default: brand.richBlack,
    },
    error: {
      default: brand.error,
      alternative: brand.error,
      muted: 'rgba(255, 64, 64, 0.12)',
    },
    success: {
      default: brand.success,
    },
  },
  ...theme,
};

/**
 * Default style applied to the app.
 *
 * @param props - Styled Components props.
 * @returns Global style React component.
 */
export const GlobalStyle = createGlobalStyle`
  /* Peer brand faces, served from static/fonts. */
  @font-face {
    font-family: 'Inter';
    src: url('/fonts/Inter-Medium.woff2') format('woff2');
    font-weight: 500;
    font-style: normal;
    font-display: swap;
  }

  @font-face {
    font-family: 'Inter';
    src: url('/fonts/Inter-SemiBold.woff2') format('woff2');
    font-weight: 600;
    font-style: normal;
    font-display: swap;
  }

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  html {
    /* 62.5% of the base size of 16px = 10px.*/
    font-size: 62.5%;
  }

  body {
    background-color: ${(props) => props.theme.colors.background?.default};
    color: ${(props) => props.theme.colors.text?.default};
    font-family: ${(props) => props.theme.fonts.default};
    font-size: ${(props) => props.theme.fontSizes.text};
    font-weight: 500;
    line-height: 1.3;
    margin: 0;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: ${(props) => props.theme.fonts.headline};
    font-weight: 600;
    text-transform: uppercase;
    line-height: 0.9;
    letter-spacing: 0;
  }

  h1 {
    font-size: ${(props) => props.theme.fontSizes.heading};
    ${(props) => props.theme.mediaQueries.small} {
      font-size: ${(props) => props.theme.fontSizes.mobileHeading};
    }
  }

  code {
    background-color: ${(props) => props.theme.colors.background?.alternative};
    color: ${(props) => props.theme.colors.text?.default};
    font-family: ${(props) => props.theme.fonts.code};
    border-radius: ${(props) => props.theme.radii.button};
    padding: 0.6rem 1rem;
    font-weight: normal;
    font-size: ${(props) => props.theme.fontSizes.small};
  }

  a {
    color: ${(props) => props.theme.colors.text?.default};
  }

  /* The neutral control. The one primary action uses the IGNITE gradient and
     is defined in Buttons.tsx. */
  button {
    font-family: ${(props) => props.theme.fonts.default};
    font-size: ${(props) => props.theme.fontSizes.small};
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    border-radius: ${(props) => props.theme.radii.button};
    background-color: transparent;
    color: ${(props) => props.theme.colors.text?.default};
    border: 1px solid ${(props) => props.theme.colors.border?.default};
    padding: 0 1.6rem;
    min-height: 4rem;
    cursor: pointer;
    transition: background-color .15s ease, border-color .15s ease, color .15s ease, opacity .15s ease;

    &:hover {
      background-color: ${(props) => props.theme.colors.background?.alternative};
      border-color: ${(props) => props.theme.colors.text?.muted};
    }

    &:focus-visible {
      outline: 2px solid ${(props) => props.theme.colors.text?.default};
      outline-offset: 2px;
    }

    &:disabled,
    &[disabled] {
      opacity: 0.4;
      cursor: not-allowed;
    }

    &:disabled:hover,
    &[disabled]:hover {
      background-color: transparent;
      border-color: ${(props) => props.theme.colors.border?.default};
    }
  }

  input, select {
    font-family: ${(props) => props.theme.fonts.default};
  }

  input:focus-visible,
  select:focus-visible,
  a:focus-visible {
    outline: 2px solid ${(props) => props.theme.colors.text?.default};
    outline-offset: 2px;
  }
`;
