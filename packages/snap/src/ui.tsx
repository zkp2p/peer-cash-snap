import {
  Banner,
  Bold,
  Box,
  Button,
  Copyable,
  Divider,
  Heading,
  Row,
  Section,
  Text,
  type SnapComponent,
  type SnapElement,
} from '@metamask/snaps-sdk/jsx';
import type { RuntimeEnv } from '@zkp2p/cash';

import { COMPANION_DAPP_URL } from './constants';
import type { OrderView } from './serialize';

/**
 * Shorten a composite deposit id for display.
 *
 * @param depositId - The full composite deposit id.
 * @returns The shortened id.
 */
const shortId = (depositId: string): string =>
  depositId.length > 14
    ? `${depositId.slice(0, 8)}…${depositId.slice(-4)}`
    : depositId;

/**
 * Human summary of one payout leg.
 *
 * @param platform - The payout platform id.
 * @param currencies - The currencies the leg offers.
 * @returns The label, e.g. `revolut → EUR, GBP`.
 */
const legLabel = (platform: string, currencies: string[]): string =>
  `${platform} → ${currencies.join(', ')}`;

type EnvironmentNoticeProps = { environment: RuntimeEnv };

const EnvironmentNoticeBanner: SnapComponent<EnvironmentNoticeProps> = ({
  environment,
}) => (
  <Banner title="Non-production environment" severity="warning">
    <Text>
      This snap currently targets the {environment} deployment of Peer.
    </Text>
  </Banner>
);

/**
 * Warning banner for non-production environments; null on production. Owns
 * the production check so every surface renders it unconditionally.
 *
 * @param environment - Active runtime environment.
 * @returns The banner, or null on production.
 */
export const environmentNotice = (
  environment: RuntimeEnv,
): SnapElement<EnvironmentNoticeProps> | null =>
  environment === 'production' ? null : (
    <EnvironmentNoticeBanner environment={environment} />
  );

type CashoutConfirmationProps = {
  origin: string;
  amountUsdc: string;
  legs: { platform: string; currencies: string[]; payee: string }[];
  estimateText: string | null;
  environment: RuntimeEnv;
};

/**
 * Dialog content asking the user to approve building a cash-out plan.
 *
 * @param props - Component props.
 * @param props.origin - Origin of the requesting site.
 * @param props.amountUsdc - Human USDC amount, e.g. `"100"`.
 * @param props.legs - Requested payout legs including payee handles.
 * @param props.estimateText - Pre-rendered estimate line, if available.
 * @param props.environment - Active runtime environment.
 * @returns The dialog content.
 */
export const CashoutConfirmation: SnapComponent<CashoutConfirmationProps> = ({
  origin,
  amountUsdc,
  legs,
  estimateText,
  environment,
}) => (
  <Box>
    <Heading>Start a cash-out?</Heading>
    <Text>
      <Bold>{origin}</Bold> wants to cash out USDC on Base through Peer.
    </Text>
    <Section>
      <Row label="Amount">
        <Text>{amountUsdc} USDC</Text>
      </Row>
      {legs.map((leg) => (
        <Row label={legLabel(leg.platform, leg.currencies)}>
          <Text>{leg.payee}</Text>
        </Row>
      ))}
      {estimateText === null ? null : (
        <Row label="Estimated payout">
          <Text>{estimateText}</Text>
        </Row>
      )}
    </Section>
    {environmentNotice(environment)}
    <Text>
      Your USDC stays escrowed in the ZKP2P protocol until a buyer pays you on
      the platform above and proves it. The final rate is the live oracle rate
      when the order fills — the estimate is not a locked quote. You can
      withdraw unmatched funds at any time.
    </Text>
    <Text>
      Approving shares the payee handle with Peer's curator service and returns
      unsigned transactions to the site. MetaMask will still ask you to confirm
      each transaction before anything moves.
    </Text>
  </Box>
);

type WithdrawConfirmationProps = {
  origin: string;
  depositId: string;
  amountUsdc: string | null;
  stateLine: string;
  environment: RuntimeEnv;
};

/**
 * Dialog content asking the user to approve a withdrawal plan.
 *
 * @param props - Component props.
 * @param props.origin - Origin of the requesting site.
 * @param props.depositId - Composite deposit id being withdrawn.
 * @param props.amountUsdc - Partial amount, or null for a full close.
 * @param props.stateLine - `order.explain()` line for context.
 * @param props.environment - Active runtime environment.
 * @returns The dialog content.
 */
export const WithdrawConfirmation: SnapComponent<WithdrawConfirmationProps> = ({
  origin,
  depositId,
  amountUsdc,
  stateLine,
  environment,
}) => (
  <Box>
    <Heading>Withdraw from your cash-out?</Heading>
    <Text>
      <Bold>{origin}</Bold> wants to withdraw from order{' '}
      <Bold>{shortId(depositId)}</Bold>.
    </Text>
    <Section>
      <Row label="Withdraw">
        <Text>
          {amountUsdc === null
            ? 'All remaining USDC (closes the order)'
            : `${amountUsdc} USDC`}
        </Text>
      </Row>
      <Row label="Status">
        <Text>{stateLine}</Text>
      </Row>
    </Section>
    {environmentNotice(environment)}
    <Text>
      Approving returns unsigned transactions to the site; MetaMask will ask you
      to confirm each one. A live buyer intent blocks a full close until it is
      delivered or expires.
    </Text>
  </Box>
);

type TopUpConfirmationProps = {
  origin: string;
  depositId: string;
  amountUsdc: string;
  stateLine: string;
  environment: RuntimeEnv;
};

/**
 * Dialog content asking the user to approve a top-up plan.
 *
 * @param props - Component props.
 * @param props.origin - Origin of the requesting site.
 * @param props.depositId - Composite deposit id being topped up.
 * @param props.amountUsdc - Human USDC amount to add.
 * @param props.stateLine - `order.explain()` line for context.
 * @param props.environment - Active runtime environment.
 * @returns The dialog content.
 */
export const TopUpConfirmation: SnapComponent<TopUpConfirmationProps> = ({
  origin,
  depositId,
  amountUsdc,
  stateLine,
  environment,
}) => (
  <Box>
    <Heading>Top up your cash-out?</Heading>
    <Text>
      <Bold>{origin}</Bold> wants to add <Bold>{amountUsdc} USDC</Bold> to order{' '}
      <Bold>{shortId(depositId)}</Bold>.
    </Text>
    <Section>
      <Row label="Status">
        <Text>{stateLine}</Text>
      </Row>
    </Section>
    {environmentNotice(environment)}
    <Text>
      The added USDC is offered at the same live market rate to the same payout
      legs. Approving returns unsigned transactions to the site; MetaMask will
      ask you to confirm each one.
    </Text>
  </Box>
);

type EnvironmentConfirmationProps = {
  origin: string;
  from: RuntimeEnv;
  to: RuntimeEnv;
};

/**
 * Dialog content confirming an environment switch.
 *
 * @param props - Component props.
 * @param props.origin - Origin of the requesting site.
 * @param props.from - Current environment.
 * @param props.to - Requested environment.
 * @returns The dialog content.
 */
export const EnvironmentConfirmation: SnapComponent<
  EnvironmentConfirmationProps
> = ({ origin, from, to }) => (
  <Box>
    <Heading>Switch Peer environment?</Heading>
    <Text>
      <Bold>{origin}</Bold> wants to switch this snap from <Bold>{from}</Bold>{' '}
      to <Bold>{to}</Bold>.
    </Text>
    <Text>
      Each environment has its own contracts, curator, and indexer. Only switch
      if you know why — staging and preproduction are for testing.
    </Text>
  </Box>
);

type OrderCardProps = { view: OrderView };

/**
 * One order rendered on the home page.
 *
 * @param props - Component props.
 * @param props.view - The order view to render.
 * @returns The section for this order.
 */
export const OrderCard: SnapComponent<OrderCardProps> = ({ view }) => (
  <Section>
    <Row label="Order">
      <Text>{shortId(view.depositId)}</Text>
    </Row>
    <Row label="State">
      <Text>{view.state}</Text>
    </Row>
    <Row label="Amount">
      <Text>{view.totalUsdc} USDC</Text>
    </Row>
    {view.filledAmount === '0' ? null : (
      <Row label="Delivered">
        <Text>{view.filledUsdc} USDC</Text>
      </Row>
    )}
    {view.payouts === undefined || view.payouts.length === 0 ? null : (
      <Row label="Via">
        <Text>
          {view.payouts
            .map((payout) => legLabel(payout.platform, payout.currencies))
            .join(' · ')}
        </Text>
      </Row>
    )}
    <Text color="muted">{view.explain}</Text>
    {view.isInFlight ? null : (
      <Button name={`untrack:${view.depositId}`} variant="destructive">
        Remove from list
      </Button>
    )}
  </Section>
);

type HomePanelProps = {
  environment: RuntimeEnv;
  views: OrderView[];
};

/**
 * The snap home page: tracked cash-out orders plus pointers to the dapp.
 *
 * @param props - Component props.
 * @param props.environment - Active runtime environment.
 * @param props.views - Order views to display.
 * @returns The home page content.
 */
export const HomePanel: SnapComponent<HomePanelProps> = ({
  environment,
  views,
}) => (
  <Box>
    <Heading>Peer Cash</Heading>
    <Text>Cash out Base USDC to fiat at the live market rate.</Text>
    {environmentNotice(environment)}
    {views.length === 0 ? (
      <Box>
        <Text>
          No cash-outs tracked yet. Start one from the Peer Cash companion dapp:
        </Text>
        <Copyable value={COMPANION_DAPP_URL} />
      </Box>
    ) : (
      <Box>
        {views.map((view) => (
          <OrderCard view={view} />
        ))}
      </Box>
    )}
    <Divider />
    <Button name="refresh">Refresh</Button>
  </Box>
);

type WelcomeProps = Record<string, never>;

/**
 * Post-install welcome dialog content.
 *
 * @returns The dialog content.
 */
export const Welcome: SnapComponent<WelcomeProps> = () => (
  <Box>
    <Heading>Peer Cash installed</Heading>
    <Text>
      This snap turns MetaMask into a Peer Cash off-ramp: escrow Base USDC in
      the ZKP2P protocol, get paid on Venmo-style fiat rails at the live oracle
      rate, with no custodian in between.
    </Text>
    <Text>
      Open the companion dapp to start a cash-out. The snap reviews every
      request, tracks your orders on its home page, and notifies you when a
      buyer pays.
    </Text>
    <Copyable value={COMPANION_DAPP_URL} />
  </Box>
);
