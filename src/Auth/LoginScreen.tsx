import { useState } from 'react';
import styled from 'styled-components';
import { authService } from '../services/AuthService';

export const LoginScreen = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [guestMode, setGuestMode] = useState(false);
  const [nickname, setNickname] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await authService.signInWithGoogle();
    } catch (err: any) {
      setError(err.message || '로그인에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    const trimmed = nickname.trim();
    if (!trimmed) { setError('닉네임을 입력해주세요'); return; }
    if (trimmed.length < 2 || trimmed.length > 12) {
      setError('닉네임은 2~12자 사이여야 합니다'); return;
    }
    setLoading(true);
    setError('');
    try {
      await authService.signInAsGuest(trimmed);
    } catch (err: any) {
      setError(err.message || '게스트 로그인에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <Content>
        <Logo>
          <img src="/images/pokemon-aegis.png" alt="Pokemon Aegis"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </Logo>
        <Subtitle>1025마리의 포켓몬과 함께하는 타워 디펜스</Subtitle>

        <LoginButton onClick={handleGoogleLogin} disabled={loading}>
          <GoogleIcon>G</GoogleIcon>
          {loading && !guestMode ? '로그인 중...' : 'Google로 로그인'}
        </LoginButton>

        <Divider><span>또는</span></Divider>

        {!guestMode ? (
          <GuestButton onClick={() => { setGuestMode(true); setError(''); }} disabled={loading}>
            👤 게스트로 플레이
          </GuestButton>
        ) : (
          <GuestForm>
            <NicknameInput
              type="text"
              placeholder="닉네임 입력 (2~12자)"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleGuestLogin()}
              maxLength={12}
              autoFocus
            />
            <GuestConfirmButton onClick={handleGuestLogin} disabled={loading}>
              {loading && guestMode ? '입장 중...' : '게스트로 입장'}
            </GuestConfirmButton>
            <CancelText onClick={() => { setGuestMode(false); setError(''); setNickname(''); }}>
              취소
            </CancelText>
          </GuestForm>
        )}

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <Notice>
          {guestMode
            ? '※ 게스트는 랭킹/업적이 저장되지 않을 수 있습니다'
            : '※ Google 로그인 또는 게스트로 플레이할 수 있습니다'}
        </Notice>
      </Content>
    </Container>
  );
};

// ─── Styled Components ────────────────────────────────────────────────────────

const Container = styled.div`
  width: 100vw; height: 100vh;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #6666ff 0%, #3388ff 100%);
`;

const Content = styled.div`
  background: white;
  padding: 3rem; border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  text-align: center; max-width: 500px; width: 90%;
`;

const Logo = styled.div`
  font-size: 4rem; margin-bottom: 1rem;
`;

const Subtitle = styled.p`
  color: #666; margin-bottom: 2rem; line-height: 1.5;
`;

const LoginButton = styled.button`
  display: flex; align-items: center; justify-content: center; gap: 1rem;
  width: 100%; padding: 1rem 2rem;
  font-size: 1.1rem; font-weight: 600;
  border: none; border-radius: 10px;
  background: #4285f4; color: white;
  cursor: pointer; transition: all 0.3s;
  &:hover:not(:disabled) {
    background: #357ae8; transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(66,133,244,0.4);
  }
  &:disabled { opacity: 0.7; cursor: not-allowed; }
`;

const GoogleIcon = styled.div`
  width: 30px; height: 30px;
  background: white; color: #4285f4;
  border-radius: 50%; display: flex;
  align-items: center; justify-content: center; font-weight: bold;
`;

const Divider = styled.div`
  position: relative; margin: 1.2rem 0;
  display: flex; align-items: center;
  &::before, &::after {
    content: ''; flex: 1; height: 1px; background: #ddd;
  }
  span { padding: 0 12px; color: #aaa; font-size: 0.9rem; }
`;

const GuestButton = styled(LoginButton)`
  background: #555;
  &:hover:not(:disabled) { background: #333; box-shadow: 0 5px 15px rgba(0,0,0,0.25); }
`;

const GuestForm = styled.div`
  display: flex; flex-direction: column; gap: 0.6rem; width: 100%;
`;

const NicknameInput = styled.input`
  width: 100%; padding: 0.9rem 1rem; font-size: 1rem;
  border: 2px solid #ddd; border-radius: 10px;
  outline: none; box-sizing: border-box;
  &:focus { border-color: #4285f4; }
`;

const GuestConfirmButton = styled(LoginButton)`
  background: #444;
  &:hover:not(:disabled) { background: #222; }
`;

const CancelText = styled.span`
  font-size: 0.85rem; color: #999; cursor: pointer; text-align: center;
  &:hover { color: #555; text-decoration: underline; }
`;

const ErrorMessage = styled.div`
  margin-top: 1rem; padding: 0.75rem;
  background: #fee; color: #c33; border-radius: 5px;
`;

const Notice = styled.div`
  margin-top: 1.5rem; font-size: 0.85rem; color: #888;
`;