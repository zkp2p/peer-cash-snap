import styled, { css } from 'styled-components';

// Styled primitives shared by the cash-out and orders panels (and the page
// toolbar), so card chrome, flow text, and input chrome are defined once.

export const Panel = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  background-color: ${({ theme }) => theme.colors.card?.default};
  margin-top: 2.4rem;
  padding: 2.4rem;
  border: 1px solid ${({ theme }) => theme.colors.border?.default};
  border-radius: ${({ theme }) => theme.radii.default};
  box-shadow: ${({ theme }) => theme.shadows.default};
`;

export const Status = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.small};
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
  border-radius: ${({ theme }) => theme.radii.default};
  background: ${({ theme }) => theme.colors.background?.default};
  color: ${({ theme }) => theme.colors.text?.default};
`;

export const Input = styled.input`
  font-size: ${({ theme }) => theme.fontSizes.text};
  padding: 1rem;
  ${inputChrome}
`;

export const Select = styled.select`
  font-size: ${({ theme }) => theme.fontSizes.text};
  padding: 1rem;
  ${inputChrome}
`;

export const SmallInput = styled.input`
  font-size: ${({ theme }) => theme.fontSizes.small};
  padding: 0.6rem;
  ${inputChrome}
`;

export const SmallSelect = styled.select`
  font-size: ${({ theme }) => theme.fontSizes.small};
  padding: 0.6rem;
  ${inputChrome}
`;
