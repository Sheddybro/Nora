import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from './components/AuthContext';
import { useMobileTheme } from './components/NativeWorkspaceScreen';
import { usePreviewRole } from './components/MobileRoleContext';

export default function MobileLoginScreen() {
  const theme = useMobileTheme();
  const router = useRouter();
  const { session, login, logout } = useAuth();
  const { role, setRole } = usePreviewRole();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('Use your NorrisBeauty owner or staff credentials.');

  useEffect(() => {
    if (session) {
      router.replace('/');
    }
  }, [session, router]);

  useEffect(() => {
    if (session?.role) {
      setRole(session.role);
    }
  }, [session, setRole]);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setMessage('Enter both username and password to continue.');
      return;
    }

    setLoading(true);
    setMessage('Signing in to NorrisBeauty...');

    try {
      const nextSession = await login(username.trim(), password);
      setRole(nextSession.role);
      setMessage(`Signed in as ${nextSession.user.display_name} (${nextSession.role}).`);
      router.replace('/');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setPassword('');
    setMessage('Signed out. You can sign in again using your business account.');
  };

  return <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top', 'left', 'right']}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 25, paddingVertical: 28 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={{ gap: 16 }}>
      <View style={{ alignItems: 'center', marginBottom: 8 }}><Text style={{ color: theme.ink, fontFamily: 'serif', fontSize: 28, fontWeight: '700' }}>✦ Norris<Text style={{ color: theme.rose }}>Beauty</Text></Text><Text style={{ color: theme.rose, fontSize: 9, fontWeight: '700', letterSpacing: 1.6, marginTop: 16 }}>BEAUTY BUSINESS, BEAUTIFULLY MANAGED</Text></View>
      <Text style={{ color: theme.ink, fontFamily: 'serif', fontSize: 26, fontWeight: '600' }}>Welcome back.</Text>
      <Text style={{ color: theme.muted, fontSize: 11, lineHeight: 17 }}>Use your NorrisBeauty owner or staff credentials to connect the app to the shared Django backend.</Text>
      <TextInput accessibilityLabel="Username" value={username} onChangeText={setUsername} placeholder="Username" placeholderTextColor={theme.muted} autoCapitalize="none" autoCorrect={false} style={{ minHeight: 48, borderWidth: 1, borderColor: theme.line, borderRadius: 7, backgroundColor: theme.card, paddingHorizontal: 13, color: theme.ink, fontSize: 11 }} />
      <TextInput accessibilityLabel="Password" value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor={theme.muted} secureTextEntry style={{ minHeight: 48, borderWidth: 1, borderColor: theme.line, borderRadius: 7, backgroundColor: theme.card, paddingHorizontal: 13, color: theme.ink, fontSize: 11 }} />
      <View style={{ flexDirection: 'row', gap: 8 }}><Pressable accessibilityRole="button" accessibilityState={{ selected: role === 'owner' }} onPress={() => setRole('owner')} style={{ flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: role === 'owner' ? theme.rose : theme.line, borderRadius: 6, backgroundColor: role === 'owner' ? theme.blush : theme.card }}><Text style={{ color: theme.ink, fontSize: 10, fontWeight: '600' }}>Owner role</Text></Pressable><Pressable accessibilityRole="button" accessibilityState={{ selected: role === 'staff' }} onPress={() => setRole('staff')} style={{ flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: role === 'staff' ? theme.rose : theme.line, borderRadius: 6, backgroundColor: role === 'staff' ? theme.blush : theme.card }}><Text style={{ color: theme.ink, fontSize: 10, fontWeight: '600' }}>Staff role</Text></Pressable></View>
      <Pressable accessibilityRole="button" disabled={loading} onPress={handleLogin} style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 7, backgroundColor: loading ? theme.line : theme.rose }}><Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>{loading ? 'Signing in...' : 'Sign in'}</Text></Pressable>
      {session ? <Pressable accessibilityRole="button" onPress={handleLogout} style={{ minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 7, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.card }}><Text style={{ color: theme.ink, fontSize: 10, fontWeight: '600' }}>Log out</Text></Pressable> : null}
      <Text accessibilityLiveRegion="polite" style={{ color: theme.muted, fontSize: 9, lineHeight: 15 }}>{message}</Text>
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
