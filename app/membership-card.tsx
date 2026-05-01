import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';

export default function MembershipCardScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.topbar}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color="#1a1a1a" />
          </Pressable>
          <Text style={styles.title}>Membership card</Text>
          <View style={styles.backBtnPlaceholder} />
        </View>

        <View style={styles.cardPlaceholder}>
          <Text style={styles.placeholderTitle}>Membership Card</Text>
          <Text style={styles.placeholderBody}>
            Coming soon. We&apos;ll add QR scanning and account-linking here.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f7f6f2' },
  container: { flex: 1, paddingHorizontal: 15, paddingTop: 14, paddingBottom: 20, gap: 14 },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPlaceholder: { width: 32, height: 32 },
  title: { color: '#1a1a1a', fontSize: 30, fontWeight: '700' },
  cardPlaceholder: {
    marginTop: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: '#ffffff',
    padding: 16,
    gap: 8,
  },
  placeholderTitle: { color: '#1a1a1a', fontSize: 20, fontWeight: '700' },
  placeholderBody: { color: '#6b6b6b', fontSize: 14, lineHeight: 20 },
});
