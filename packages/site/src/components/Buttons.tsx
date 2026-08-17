import type { ComponentProps } from 'react';
import styled, { css } from 'styled-components';

import { ReactComponent as FlaskFox } from '../assets/flask_fox.svg';
import { igniteGradient, igniteGradientHover } from '../config/theme';
import { useMetaMask, useRequestSnap } from '../hooks';
import { shouldDisplayReconnectButton } from '../utils';

// The IGNITE gradient marks the primary action and nothing else. Peer's brand
// book reserves it for calls to action, so only the install and connect
// controls wear it; every other control keeps the neutral chrome from
// GlobalStyle.
const primaryChrome = css`
  display: inline-flex;
  align-self: flex-start;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  min-height: 4rem;
  padding: 0 1.6rem;
  font-size: ${({ theme }) => theme.fontSizes.small};
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  text-decoration: none;
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.radii.button};
  background-image: ${igniteGradient};
  color: #000000;
  cursor: pointer;
  transition: background-image 0.15s ease, opacity 0.15s ease;

  &:hover {
    background-image: ${igniteGradientHover};
    color: #000000;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.text?.default};
    outline-offset: 2px;
  }

  /* An unavailable action drops the gradient rather than dimming it into a
     muddy smear. */
  &:disabled,
  &[disabled],
  &:disabled:hover,
  &[disabled]:hover {
    background-image: none;
    border-color: ${({ theme }) => theme.colors.border?.default};
    color: ${({ theme }) => theme.colors.text?.muted};
    cursor: not-allowed;
  }

  svg {
    flex: none;
  }

  ${({ theme }) => theme.mediaQueries.small} {
    width: 100%;
  }
`;

const Link = styled.a`
  ${primaryChrome}
`;

/** The single primary action on a view. Wears the IGNITE gradient. */
export const PrimaryButton = styled.button`
  ${primaryChrome}
`;

const SecondaryButton = styled.button`
  display: inline-flex;
  align-self: flex-start;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: auto;
  ${({ theme }) => theme.mediaQueries.small} {
    width: 100%;
  }
`;

const ConnectedContainer = styled.div`
  display: flex;
  align-self: flex-start;
  align-items: center;
  gap: 1rem;
  font-size: ${(props) => props.theme.fontSizes.small};
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  border-radius: ${(props) => props.theme.radii.button};
  border: 1px solid ${(props) => props.theme.colors.border?.default};
  color: ${(props) => props.theme.colors.text?.default};
  min-height: 4rem;
  padding: 0 1.6rem;
`;

const ConnectedIndicator = styled.div`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.colors.success?.default};
`;

export const InstallFlaskButton = () => (
  <Link href="https://metamask.io/flask/" target="_blank">
    <FlaskFox />
    Install MetaMask Flask
  </Link>
);

export const ConnectButton = (props: ComponentProps<typeof PrimaryButton>) => {
  return (
    <PrimaryButton {...props}>
      <FlaskFox />
      Connect
    </PrimaryButton>
  );
};

export const ReconnectButton = (
  props: ComponentProps<typeof SecondaryButton>,
) => {
  return (
    <SecondaryButton {...props}>
      <FlaskFox />
      Reconnect
    </SecondaryButton>
  );
};

export const HeaderButtons = () => {
  const requestSnap = useRequestSnap();
  const { isFlask, installedSnap } = useMetaMask();

  if (!isFlask && !installedSnap) {
    return <InstallFlaskButton />;
  }

  if (!installedSnap) {
    return <ConnectButton onClick={requestSnap} />;
  }

  if (shouldDisplayReconnectButton(installedSnap)) {
    return <ReconnectButton onClick={requestSnap} />;
  }

  return (
    <ConnectedContainer>
      <ConnectedIndicator />
      Connected
    </ConnectedContainer>
  );
};
