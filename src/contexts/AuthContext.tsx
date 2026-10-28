import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/db/supabase';
import type { User } from '@supabase/supabase-js';
import type { Profile, RelayUser } from '@/types/types';
import { fetchMyRelayProfile, portalRegister } from '@/services/portal';

/** 双身份：管理员（profiles.role=admin）/ 客户端接入方（relay_users.auth_uid） */
export type Identity = 'admin' | 'client' | null;

const ADMIN_EMAIL_SUFFIX = '@miaoda.com';
const CLIENT_EMAIL_SUFFIX = '@user.miaoda.com';

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    console.error('获取用户信息失败:', error.message);
    return null;
  }
  return data;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  relayProfile: RelayUser | null;
  identity: Identity;
  loading: boolean;
  signInAdmin: (username: string, password: string) => Promise<{ error: Error | null }>;
  signInClient: (username: string, password: string) => Promise<{ error: Error | null }>;
  signUpClient: (username: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshRelayProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function friendlyAuthError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return '账号或密码错误';
  if (msg.includes('already registered')) return '该用户名已被注册';
  if (msg.includes('Password should be at least')) return '密码强度不足（至少 6 位）';
  if (msg.includes('PORTAL_USERNAME_TAKEN')) return '用户名已被占用，请更换';
  if (msg.includes('PORTAL_BAD_USERNAME')) return '用户名需为 3-32 位字母/数字/下划线';
  return msg;
}

/** 身份判定：admin 走 profiles.role，client 走 relay_users.auth_uid */
async function resolveIdentity(u: User): Promise<{
  profile: Profile | null;
  relay: RelayUser | null;
  identity: Identity;
}> {
  const [p, r] = await Promise.all([
    getProfile(u.id),
    fetchMyRelayProfile().catch(() => null),
  ]);
  if (p && p.role === 'admin') return { profile: p, relay: r, identity: 'admin' };
  if (r) return { profile: p, relay: r, identity: 'client' };
  return { profile: p, relay: null, identity: null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [relayProfile, setRelayProfile] = useState<RelayUser | null>(null);
  const [identity, setIdentity] = useState<Identity>(null);
  const [loading, setLoading] = useState(true);

  // 注意：onAuthStateChange 回调内不使用 await，统一 .then 避免死锁
  const applyUser = (u: User | null) => {
    setUser(u);
    if (!u) {
      setProfile(null);
      setRelayProfile(null);
      setIdentity(null);
      return;
    }
    resolveIdentity(u)
      .then((r) => {
        setProfile(r.profile);
        setRelayProfile(r.relay);
        setIdentity(r.identity);
      })
      .catch(() => {
        setIdentity(null);
      });
  };

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        applyUser(data.session?.user ?? null);
      })
      .catch(() => undefined)
      .finally(() => {
        setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      applyUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (!user) {
      setProfile(null);
      return;
    }
    setProfile(await getProfile(user.id));
  };

  const refreshRelayProfile = async () => {
    setRelayProfile(await fetchMyRelayProfile().catch(() => null));
  };

  const signInAdmin = async (username: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: `${username}${ADMIN_EMAIL_SUFFIX}`,
        password,
      });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: new Error(friendlyAuthError((error as Error).message)) };
    }
  };

  const signInClient = async (username: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: `${username}${CLIENT_EMAIL_SUFFIX}`,
        password,
      });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: new Error(friendlyAuthError((error as Error).message)) };
    }
  };

  const signUpClient = async (username: string, password: string, displayName?: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: `${username}${CLIENT_EMAIL_SUFFIX}`,
        password,
      });
      if (error) throw error;
      if (!data.session) throw new Error('注册会话建立失败，请稍后重试');
      // 注册成功后立即建档：绑定默认分组 + 发放初始额度
      const relay = await portalRegister(username, displayName);
      setRelayProfile(relay);
      setIdentity('client');
      return { error: null };
    } catch (error) {
      // 建档失败则回收半注册会话，避免无效登录态
      await supabase.auth.signOut().catch(() => undefined);
      setUser(null);
      setRelayProfile(null);
      setIdentity(null);
      return { error: new Error(friendlyAuthError((error as Error).message)) };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setRelayProfile(null);
    setIdentity(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        relayProfile,
        identity,
        loading,
        signInAdmin,
        signInClient,
        signUpClient,
        signOut,
        refreshProfile,
        refreshRelayProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}