import { useState } from 'react';
import styled from 'styled-components';

type CheckedProps = {
  readonly checked: boolean;
};

// A monochrome switch. The theme is a preference, not a primary action, so it
// stays neutral chrome and never takes the IGNITE gradient.
const ToggleWrapper = styled.label`
  position: relative;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
`;

const ToggleInput = styled.input`
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  border: 0;

  &:focus-visible + span {
    outline: 2px solid ${({ theme }) => theme.colors.text?.default};
    outline-offset: 2px;
  }
`;

const ToggleTrack = styled.span<CheckedProps>`
  display: block;
  position: relative;
  width: 44px;
  height: 24px;
  border-radius: ${({ theme }) => theme.radii.pill};
  border: 1px solid ${({ theme }) => theme.colors.border?.default};
  background-color: ${({ checked, theme }) =>
    checked ? theme.colors.background?.alternative : 'transparent'};
  transition: background-color 0.15s ease, border-color 0.15s ease;

  &::after {
    content: '';
    position: absolute;
    top: 3px;
    left: ${({ checked }) => (checked ? '23px' : '3px')};
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background-color: ${({ theme }) => theme.colors.icon?.default};
    transition: left 0.2s cubic-bezier(0.23, 1, 0.32, 1);
  }
`;

export const Toggle = ({
  onToggle,
  defaultChecked = false,
}: {
  onToggle: () => void;
  defaultChecked?: boolean;
}) => {
  const [checked, setChecked] = useState(defaultChecked);

  const handleChange = () => {
    onToggle();
    setChecked(!checked);
  };

  return (
    <ToggleWrapper>
      <ToggleInput
        type="checkbox"
        role="switch"
        aria-label="Dark theme"
        checked={checked}
        onChange={handleChange}
      />
      <ToggleTrack checked={checked} />
    </ToggleWrapper>
  );
};
