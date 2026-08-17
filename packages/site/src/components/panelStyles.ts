import styled, { css } from 'styled-components';

// Styled primitives shared by the cash-out and orders panels (and the page
// toolbar), so card chrome, flow text, and input chrome are defined once.

export const Panel = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 64.8rem;
  background-color: ${({ theme }) => theme.colors.card?.default};
  margin-top: 1.6rem;
  padding: 2.4rem;
  border: 1px solid ${({ theme }) => theme.colors.border?.default};
  border-radius: ${({ theme }) => theme.radii.default};
  ${({ theme }) => theme.mediaQueries.small} {
    padding: 1.6rem;
  }
`;

export const Status = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.small};
  color: ${({ theme }) => theme.colors.text?.muted};
  margin: 1.2rem 0 0 0;
`;

export const ErrorText = styled.p`
  color: ${({ theme }) => theme.colors.error?.default};
  font-size: ${({ theme }) => theme.fontSizes.small};
  margin: 1.2rem 0 0 0;
  word-break: break-word;
`;

// Border/background/text chrome shared by every input and select.
export const inputChrome = css`
  border: 1px solid ${({ theme }) => theme.colors.border?.default};
  border-radius: ${({ theme }) => theme.radii.button};
  background: ${({ theme }) => theme.colors.background?.default};
  color: ${({ theme }) => theme.colors.text?.default};

  &::placeholder {
    color: ${({ theme }) => theme.colors.text?.muted};
  }
`;

export const Input = styled.input`
  font-size: ${({ theme }) => theme.fontSizes.text};
  min-height: 4rem;
  padding: 0 1.2rem;
  ${inputChrome}
`;

export const Select = styled.select`
  font-size: ${({ theme }) => theme.fontSizes.text};
  min-height: 4rem;
  padding: 0 1.2rem;
  ${inputChrome}
`;

export const SmallInput = styled.input`
  font-size: ${({ theme }) => theme.fontSizes.small};
  min-height: 4rem;
  padding: 0 1.2rem;
  ${inputChrome}
`;

export const SmallSelect = styled.select`
  font-size: ${({ theme }) => theme.fontSizes.small};
  min-height: 4rem;
  padding: 0 1.2rem;
  ${inputChrome}
`;
