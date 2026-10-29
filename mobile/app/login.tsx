import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMobileTheme } from './components/NativeWorkspaceScreen';
import { usePreviewRole } from './components/MobileRoleContext';

export default function MobileLoginScreen() {
  const theme = useMobileTheme();
  const router = useRouter();
  const { role, setRole } = usePreviewRole();
  const [message, setMessage] = useState('Preview sign-in only. Authentication is not connected.');

  const continuePreview = () => {
    setMessage(`Preview navigation switched to ${role}. No account was authenticated.`);
    router.replace('/');
  };

  return <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top', 'left', 'right']}>
    <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 25, paddingVertical: 28, gap: 16 }}>
      <View style={{ alignItems: 'center', marginBottom: 8 }}><Text style={{ color: theme.ink, fontFamily: 'serif', fontSize: 28, fontWeight: '700' }}>✦ Norris<Text style={{ color: theme.rose }}>Beauty</Text></Text><Text style={{ color: theme.rose, fontSize: 9, fontWeight: '700', letterSpacing: 1.6, marginTop: 16 }}>BEAUTY BUSINESS, BEAUTIFULLY MANAGED</Text></View>
      <Text style={{ color: theme.ink, fontFamily: 'serif', fontSize: 26, fontWeight: '600' }}>Welcome back.</Text>
      <Text style={{ color: theme.muted, fontSize: 11, lineHeight: 17 }}>Sign-in interface preview. Credentials are not submitted or verified in this mobile shell.</Text>
      <TextInput accessibilityLabel="Email or username" placeholder="Email or username" placeholderTextColor={theme.muted} autoCapitalize="none" style={{ minHeight: 48, borderWidth: 1, borderColor: theme.line, borderRadius: 7, backgroundColor: theme.card, paddingHorizontal: 13, color: theme.ink, fontSize: 11 }} />
      <TextInput accessibilityLabel="Password" placeholder="Password" placeholderTextColor={theme.muted} secureTextEntry style={{ minHeight: 48, borderWidth: 1, borderColor: theme.line, borderRadius: 7, backgroundColor: theme.card, paddingHorizontal: 13, color: theme.ink, fontSize: 11 }} />
  <View style={{ flexDirection: 'row', gap: 8 }}><Pressable accessibilityRole="button" accessibilityState={{ selected: role === 'owner' }} onPress={() => setRole('owner')} style={{ flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: role === 'owner' ? theme.rose : theme.line, borderRadius: 6, backgroundColor: role === 'owner' ? theme.blush : theme.card }}><Text style={{ color: theme.ink, fontSize: 10, fontWeight: '600' }}>Owner preview</Text></Pressable><Pressable accessibilityRole="button" accessibilityState={{ selected: role === 'staff' }} onPress={() => setRole('staff')} style={{ flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: role === 'staff' ? theme.rose : theme.line, borderRadius: 6, backgroundColor: role === 'staff' ? theme.blush : theme.card }}><Text style={{ color: theme.ink, fontSize: 10, fontWeight: '600' }}>Staff preview</Text></Pressable></View>
  <Pressable accessibilityRole="button" onPress={continuePreview} style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 7, backgroundColor: theme.rose }}><Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>Continue preview</Text></Pressable>
  <Text accessibilityLiveRegion="polite" style={{ color: theme.muted, fontSize: 9, lineHeight: 15 }}>{message}</Text>
    </View>
  </SafeAreaView>;
}
