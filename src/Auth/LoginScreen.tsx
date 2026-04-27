import { useState } from 'react';
import styled from 'styled-components';
import { media } from '../utils/responsive.utils';
import { authService } from '../services/AuthService';
import { ShootingStarsBackground } from '../components/UI/ShootingStarsBackground';
import { Settings } from '../components/Modals/Settings';
import { useTranslation } from '../i18n';

export const LoginScreen = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [guestMode, setGuestMode] = useState(false);
  const [nickname, setNickname] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  const getErrorMessage = (err: any) => {
    const code = err?.code;
    if (code === 'auth/popup-closed-by-user') return t('login.errPopupClosed');
    if (code === 'auth/network-request-failed') return t('login.errNetwork');
    return err?.message || t('login.errDefault');
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await authService.signInWithGoogle();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    const trimmed = nickname.trim();
    if (!trimmed) { setError(t('login.errEmpty')); return; }
    if (trimmed.length < 2 || trimmed.length > 12) {
      setError(t('login.errLength')); return;
    }
    setLoading(true);
    setError('');
    try {
      await authService.signInAsGuest(trimmed);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ShootingStarsBackground />
      <Container>
        <SettingsBtn onClick={() => setShowSettings(true)}>⚙️ {t('nav.settings')}</SettingsBtn>
        <Content>
          <Logo>
          <img src="/images/pokemon-aegis.png" alt="Pokemon Aegis"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </Logo>
        <Subtitle>{t('login.title')}</Subtitle>

        <LoginButton onClick={handleGoogleLogin} disabled={loading}>
          <GoogleIcon>G</GoogleIcon>
          {loading && !guestMode ? t('login.loggingIn') : t('login.google')}
        </LoginButton>

        <Divider><span>{t('login.or')}</span></Divider>

        {!guestMode ? (
          <GuestButton onClick={() => { setGuestMode(true); setError(''); }} disabled={loading}>
            {t('login.guestBtn')}
          </GuestButton>
        ) : (
          <GuestForm>
            <NicknameInput
              type="text"
              placeholder={t('login.guestPlaceholder')}
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleGuestLogin()}
              maxLength={12}
              autoFocus
            />
            <GuestConfirmButton onClick={handleGuestLogin} disabled={loading}>
              {loading && guestMode ? t('login.guestEntering') : t('login.guestEnter')}
            </GuestConfirmButton>
            <CancelText onClick={() => { setGuestMode(false); setError(''); setNickname(''); }}>
              {t('login.cancel')}
            </CancelText>
          </GuestForm>
        )}

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <Notice>
          {guestMode ? t('login.noticeGuest') : t('login.noticeDefault')}
        </Notice>
        </Content>
      </Container>
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </>
  );
};

// ─── Styled Components ────────────────────────────────────────────────────────

const Container = styled.div`
  width: 100vw; height: 100vh;
  display: flex; align-items: center; justify-content: center;
  position: relative;
  z-index: 10;
  background-color: transparent;
`;

const SettingsBtn = styled.button`
  position: absolute;
  top: 1.5rem; right: 1.5rem;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: white;
  padding: 0.6rem 1rem;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { background: rgba(255, 255, 255, 0.1); }
  ${media.mobile} {
    top: 1rem;
    right: 1rem;
    padding: 0.5rem 0.75rem;
    font-size: 0.8rem;
  }
`;

const Content = styled.div`
  background: rgba(26, 27, 33, 0.85);
  backdrop-filter: blur(12px);
  padding: 2rem; border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 24px 48px rgba(0,0,0,0.4);
  text-align: center; max-width: 440px; width: 90%;
  color: #fff;
  ${media.mobile} {
    padding: 1.5rem 1.25rem;
    width: 95%;
  }
`;

const Logo = styled.div`
  font-size: 4rem; margin-bottom: 1rem;
  ${media.mobile} {
    font-size: 3rem;
    margin-bottom: 0.75rem;
  }
`;

const Subtitle = styled.p`
  color: #a0a0a0; margin-bottom: 2rem; line-height: 1.5; font-size: 0.95rem;
`;

const LoginButton = styled.button`
  display: flex; align-items: center; justify-content: center; gap: 1rem;
  width: 100%; padding: 1rem 2rem;
  font-size: 1rem; font-weight: 500;
  border: 1px solid rgba(255,255,255,0.05); border-radius: 8px;
  background: #2563eb; color: white;
  cursor: pointer; transition: background 0.2s;
  &:hover:not(:disabled) {
    background: #1d4ed8;
  }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const GoogleIcon = styled.div`
  width: 24px; height: 24px;
  background: transparent; color: white;
  border-radius: 50%; display: flex;
  align-items: center; justify-content: center; font-weight: bold; font-size: 1.2rem;
`;

const Divider = styled.div`
  position: relative; margin: 1.5rem 0;
  display: flex; align-items: center;
  &::before, &::after {
    content: ''; flex: 1; height: 1px; background: rgba(255,255,255,0.1);
  }
  span { padding: 0 12px; color: #666; font-size: 0.85rem; }
`;

const GuestButton = styled(LoginButton)`
  background: #2a2b32;
  border: 1px solid rgba(255,255,255,0.1);
  &:hover:not(:disabled) { background: #3f414a; }
`;

const GuestForm = styled.div`
  display: flex; flex-direction: column; gap: 0.6rem; width: 100%;
`;

const NicknameInput = styled.input`
  width: 100%; padding: 0.9rem 1rem; font-size: 0.95rem;
  background: rgba(0,0,0,0.2); color: white;
  border: 1px solid rgba(255,255,255,0.15); border-radius: 8px;
  outline: none; box-sizing: border-box; transition: border-color 0.2s;
  &:focus { border-color: #2563eb; }
  &::placeholder { color: #666; }
`;

const GuestConfirmButton = styled(LoginButton)`
  background: #10b981;
  &:hover:not(:disabled) { background: #059669; }
`;

const CancelText = styled.span`
  font-size: 0.85rem; color: #666; cursor: pointer; text-align: center; margin-top: 0.5rem;
  &:hover { color: #aaa; text-decoration: underline; }
`;

const ErrorMessage = styled.div`
  margin-top: 1rem; padding: 0.75rem; font-size: 0.9rem;
  background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 6px;
`;

const Notice = styled.div`
  margin-top: 1.5rem; font-size: 0.8rem; color: #555;
`;