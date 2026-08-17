import type { ReactNode } from 'react';
import styled from 'styled-components';

const Section = styled.section`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 96rem;
`;

const Eyebrow = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.small};
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text?.muted};
  margin: 0 0 2rem 0;
  text-align: center;
`;

const Title = styled.h1`
  margin: 0;
  text-align: center;
  max-width: 20ch;
`;

const Lede = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.large};
  color: ${({ theme }) => theme.colors.text?.muted};
  line-height: 1.4;
  margin: 2rem 0 0 0;
  text-align: center;
  max-width: 54rem;
  ${({ theme }) => theme.mediaQueries.small} {
    font-size: ${({ theme }) => theme.fontSizes.text};
    margin-top: 1.6rem;
  }
`;

const Action = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.2rem;
  margin-top: 3.2rem;
  ${({ theme }) => theme.mediaQueries.small} {
    align-self: stretch;
    margin-top: 2.4rem;
  }
`;

const ActionNote = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.small};
  color: ${({ theme }) => theme.colors.text?.muted};
  margin: 0;
  text-align: center;
`;

const Rails = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.small};
  color: ${({ theme }) => theme.colors.text?.muted};
  margin: 4.8rem 0 0 0;
  text-align: center;
  ${({ theme }) => theme.mediaQueries.small} {
    margin-top: 3.2rem;
  }
`;

const Steps = styled.ol`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 3.2rem;
  width: 100%;
  list-style: none;
  margin: 2.4rem 0 0 0;
  padding: 3.2rem 0 0 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border?.default};
  ${({ theme }) => theme.mediaQueries.small} {
    grid-template-columns: 1fr;
    gap: 2.4rem;
    padding-top: 2.4rem;
  }
`;

const Step = styled.li`
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
`;

const StepIndex = styled.span`
  font-family: ${({ theme }) => theme.fonts.headline};
  font-size: ${({ theme }) => theme.fontSizes.large};
  font-weight: 600;
  line-height: 1;
  color: ${({ theme }) => theme.colors.text?.muted};
`;

const StepTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.text};
  margin: 0;
`;

const StepBody = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.small};
  color: ${({ theme }) => theme.colors.text?.muted};
  line-height: 1.5;
  margin: 0;
`;

const Custody = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.small};
  color: ${({ theme }) => theme.colors.text?.muted};
  line-height: 1.5;
  margin: 3.2rem 0 0 0;
  padding: 1.6rem 2rem;
  width: 100%;
  border: 1px solid ${({ theme }) => theme.colors.border?.default};
  border-radius: ${({ theme }) => theme.radii.inner};

  strong {
    color: ${({ theme }) => theme.colors.text?.default};
    font-weight: 600;
  }
`;

const STEPS = [
  {
    title: 'You escrow USDC',
    body: 'Pick an amount and a payout rail. Your Base USDC is escrowed in the ZKP2P protocol at the live oracle rate, with zero spread.',
  },
  {
    title: 'A buyer pays you',
    body: 'A buyer signals an intent, pays you on the rail you chose, and proves that payment with TEE-TLS.',
  },
  {
    title: 'The protocol settles',
    body: 'The protocol releases the escrowed USDC to the buyer. Anything that never matches is withdrawable at any time.',
  },
];

/**
 * The acquisition surface shown until the snap is installed and an account is
 * connected: what Peer Cash does, how the off-ramp works, and the one action
 * that moves the visitor forward.
 *
 * @param props - Component props.
 * @param props.action - The single primary call to action for the current state.
 * @param props.actionNote - One line of context under the call to action.
 * @returns The hero section.
 */
export const Hero = ({
  action,
  actionNote,
}: {
  action: ReactNode;
  actionNote: string;
}) => (
  <Section>
    <Eyebrow>Peer Cash · a MetaMask Snap</Eyebrow>
    <Title>Cash out USDC without a custodian</Title>
    <Lede>
      Peer Cash turns your wallet into an off-ramp for Base USDC. Escrow it in
      the ZKP2P protocol, get paid on a fiat rail you already use, and settle at
      the live oracle rate.
    </Lede>
    <Action>
      {action}
      <ActionNote>{actionNote}</ActionNote>
    </Action>
    <Rails>Revolut · Wise · Zelle · Chime · USD, EUR, GBP and more</Rails>
    <Steps>
      {STEPS.map((step, index) => (
        <Step key={step.title}>
          <StepIndex>{`0${index + 1}`}</StepIndex>
          <StepTitle>{step.title}</StepTitle>
          <StepBody>{step.body}</StepBody>
        </Step>
      ))}
    </Steps>
    <Custody>
      <strong>The snap never holds your keys.</strong> It reviews each request,
      shows you the amount, rail, payee and a live estimate, then hands back
      unsigned transactions. MetaMask asks you to confirm every one.
    </Custody>
  </Section>
);
