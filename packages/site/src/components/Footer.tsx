import styled, { useTheme } from 'styled-components';

import { SnapLogo } from './SnapLogo';

const FooterWrapper = styled.footer`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  padding: 2rem 3.2rem;
  border-top: 1px solid ${(props) => props.theme.colors.border?.default};
  ${({ theme }) => theme.mediaQueries.small} {
    padding: 2rem 1.6rem;
  }
`;

const BuiltBy = styled.a`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.8rem;
  font-size: ${({ theme }) => theme.fontSizes.small};
  color: ${({ theme }) => theme.colors.text?.muted};
  text-decoration: none;
  border-radius: ${({ theme }) => theme.radii.button};

  &:hover {
    color: ${({ theme }) => theme.colors.text?.default};
  }
`;

export const Footer = () => {
  const theme = useTheme();

  return (
    <FooterWrapper>
      <BuiltBy href="https://peer.xyz" target="_blank" rel="noreferrer">
        <SnapLogo color={theme.colors.icon?.alternative} size={16} />
        Built by Peer
      </BuiltBy>
    </FooterWrapper>
  );
};
