import styled from 'styled-components';
import {Onboarding} from '@universal-login/react';
import React from 'react';

interface OnboardingModalProps {
  sdk: any;
  walletService: any;
  domains: any;
}

export function OnboardingModal({sdk, walletService, domains}: OnboardingModalProps) {
  return (
    <ModalContainer>
      <ModalContent>
        <p style={{color: 'white', fontSize: 20, textAlign: 'center'}}>
          Create or connect account
        </p>
        <p style={{color: 'white', fontSize: 15}}>
          Type a nickname you want
        </p>
        <Onboarding
          sdk={sdk}
          walletService={walletService}
          domains={domains}
        />
      </ModalContent>
    </ModalContainer>
  );
}

const ModalContainer = styled('div')`
  position: fixed;
  left: 0;
  top: 0;
  background: rgba(0, 0, 0, 0.5);
  width: 100%;
  height: 100%;
  padding: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2;
`;
const ModalContent = styled('div')`
  background: radial-gradient(720.65px at 50% 0%, #0C0E57 0%, #14052C 100%);
  padding: 40px;
  overflow-y: scroll;
  max-height: 100%;
  border-radius: 6px;
  width: 50%;
`;
