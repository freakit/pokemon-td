import React, { useState } from 'react';
import styled from 'styled-components';
import { lMedia} from '../../utils/responsive.utils';
import { Settings } from '../modals/Settings';

const FloatingBtn = styled.button`
  position: fixed;
  bottom: 12px;
  right: 12px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: white;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
  transition: background 0.2s, border-color 0.2s;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  touch-action: manipulation;
  
  @media (hover: hover) {
    &:hover {
      background: rgba(0, 0, 0, 0.8);
      transform: scale(1.1);
      border-color: rgba(255, 255, 255, 0.6);
    }
  }
  ${lMedia.phoneSm} {
    width: 32px;
    height: 32px;
    font-size: 16px;
    bottom: 8px;
    right: 8px;
  }
`;

export const FloatingSettings: React.FC = () => {
  const [show, setShow] = useState(false);
  
  return (
    <>
      <FloatingBtn onClick={() => setShow(true)} title="설정 (Settings)">
        ⚙️
      </FloatingBtn>
      {show && <Settings onClose={() => setShow(false)} />}
    </>
  );
};