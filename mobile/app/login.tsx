import React, { useEffect, useState } from 'react';
import { Image, ImageBackground, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from './components/AuthContext';
import { useMobileTheme } from './components/NativeWorkspaceScreen';
import { getPasswordResetUrl } from '../lib/auth';

export default function MobileLoginScreen() {
  const theme = useMobileTheme();
  const router = useRouter();
  const { session, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (session) {
      router.replace('/');
    }
  }, [session, router]);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setMessage('Enter both username and password to continue.');
      return;
    }

    setLoading(true);
    setMessage('Signing in to NorrisBeauty...');

    try {
      const nextSession = await login(username.trim(), password);
      setMessage(`Signed in as ${nextSession.user.display_name} (${nextSession.role}).`);
      router.replace('/');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    try {
      await Linking.openURL(getPasswordResetUrl());
    } catch (error) {
      const detail = error instanceof Error ? ` ${error.message}` : '';
      setMessage(`Could not open password reset.${detail}`);
    }
  };

  return <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top', 'left', 'right']}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, width: '100%', paddingBottom: 24 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <ImageBackground source={require('../assets/beauty-art.jpg')} resizeMode="cover" imageStyle={{ width: '100%', height: '100%' }} style={{ width: '100%', minHeight: 235, justifyContent: 'flex-start', padding: 24, overflow: 'hidden' }}>
          <View pointerEvents="none" style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(45, 28, 33, 0.48)' }} />
          <Image source={require('../assets/norris-logo.jpeg')} accessibilityLabel="Norris Beautyquest logo" resizeMode="contain" style={{ width: 106, height: 66, borderRadius: 8, backgroundColor: '#FFFFFF' }} />
        </ImageBackground>
        <View style={{ paddingHorizontal: 22, paddingTop: 28, gap: 10 }}>
          <Image source={require('../assets/norris-logo.jpeg')} accessibilityLabel="Norris Beautyquest logo" resizeMode="contain" style={{ width: 82, height: 54, borderRadius: 7, backgroundColor: '#FFFFFF' }} />
          <Text style={{ color: theme.rose, fontSize: 9, fontWeight: '700', letterSpacing: 1.6, marginTop: 7 }}>WELCOME BACK</Text>
          <Text style={{ color: theme.ink, fontFamily: 'serif', fontSize: 27, lineHeight: 33, fontWeight: '600' }}>Sign in to your workspace</Text>
          <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 18, marginBottom: 4 }}>Secure access for owners and staff.</Text>
          <Text accessibilityRole="text" style={{ color: theme.ink, fontSize: 12, fontWeight: '500' }}>Username</Text>
          <TextInput accessibilityLabel="Username" value={username} onChangeText={(value) => { setUsername(value); setMessage(''); }} placeholder="Username" placeholderTextColor={theme.muted} autoCapitalize="none" autoCorrect={false} autoComplete="username" style={{ minHeight: 48, borderWidth: 1, borderColor: theme.line, borderRadius: 7, backgroundColor: theme.card, paddingHorizontal: 13, color: theme.ink, fontSize: 14 }} />
          <Text accessibilityRole="text" style={{ color: theme.ink, fontSize: 12, fontWeight: '500', marginTop: 4 }}>Password</Text>
          <View style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: theme.line, borderRadius: 7, backgroundColor: theme.card }}>
            <TextInput accessibilityLabel="Password" value={password} onChangeText={(value) => { setPassword(value); setMessage(''); }} placeholder="Password" placeholderTextColor={theme.muted} secureTextEntry={!passwordVisible} autoComplete="current-password" style={{ flex: 1, minHeight: 48, paddingHorizontal: 13, color: theme.ink, fontSize: 14 }} />
            <Pressable accessibilityRole="button" accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'} accessibilityHint="Shows or hides the password you entered." accessibilityState={{ expanded: passwordVisible }} onPress={() => setPasswordVisible((visible) => !visible)} style={{ minWidth: 64, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 }}>
              <Text style={{ color: theme.rose, fontSize: 12, fontWeight: '600', textDecorationLine: 'underline' }}>{passwordVisible ? 'Hide' : 'Show'}</Text>
            </Pressable>
          </View>
          <Pressable accessibilityRole="button" onPress={handlePasswordReset} style={{ minHeight: 40, alignSelf: 'flex-end', justifyContent: 'center', paddingHorizontal: 4 }}>
            <Text style={{ color: theme.rose, fontSize: 11, textDecorationLine: 'underline' }}>Forgot your password?</Text>
          </Pressable>
          <Pressable accessibilityRole="button" disabled={loading} onPress={handleLogin} style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 7, backgroundColor: loading ? theme.line : theme.rose }}>
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>{loading ? 'Signing in...' : 'Sign in →'}</Text>
          </Pressable>
          {message ? <Text accessibilityLiveRegion="polite" accessibilityRole="alert" style={{ color: theme.rose, fontSize: 11, lineHeight: 16 }}>{message}</Text> : null}
          <Text style={{ color: theme.muted, fontSize: 11, lineHeight: 17, marginTop: 3 }}>Accounts are provisioned by your business administrator.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
