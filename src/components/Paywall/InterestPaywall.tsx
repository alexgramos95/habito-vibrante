/**
 * InterestPaywall is now deprecated.
 * Use PaywallModal instead for consistency.
 * 
 * This component is kept for backward compatibility but
 * now just re-exports PaywallModal with the same interface.
 */

import { PaywallModal } from "./PaywallModal";

interface InterestPaywallProps {
  open: boolean;
  onClose: () => void;
}

export const InterestPaywall = ({ open, onClose }: InterestPaywallProps) => {
  return (
    <PaywallModal 
      open={open} 
      onClose={onClose} 
      onUpgrade={() => {}} 
    />
  );
};
