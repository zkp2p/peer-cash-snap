import styled, { useTheme } from 'styled-components';

import { HeaderButtons } from './Buttons';
import { SnapLogo } from './SnapLogo';
import { Toggle } from './Toggle';
import { getThemePreference } from '../utils';

const HeaderWrapper = styled.header`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  gap: 1.6rem;
  padding: 1.6rem 3.2rem;
  border-bottom: 1px solid ${(props) => props.theme.colors.border?.default};
  ${({ theme }) => theme.mediaQueries.small} {
    padding: 1.6rem;
  }
`;

const Title = styled.span`
  font-family: ${({ theme }) => theme.fonts.headline};
  font-size: ${(props) => props.theme.fontSizes.large};
  font-weight: 600;
  text-transform: uppercase;
  line-height: 1;
  margin: 0;
`;

const LogoWrapper = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 1.2rem;
`;

const RightContainer = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 1.6rem;
`;

export const Header = ({
  handleToggleClick,
}: {
  handleToggleClick: () => void;
}) => {
  const theme = useTheme();

  return (
    <HeaderWrapper>
      <LogoWrapper>
        <SnapLogo color={theme.colors.icon?.default} size={24} />
        <Title>Peer Cash</Title>
      </LogoWrapper>
      <RightContainer>
        <Toggle
          onToggle={handleToggleClick}
          defaultChecked={getThemePreference()}
        />
        <HeaderButtons />
      </RightContainer>
    </HeaderWrapper>
  );
};
