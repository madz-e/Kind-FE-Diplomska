import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Toast from 'react-native-toast-message';
import { pastel } from '@/components';
import { SoftIcon } from '@/components/home/SoftGlass';

const hideToast = () => Toast.hide();

// One shared pastel layout, used by every toast type
const PastelToast = ({ text1, text2, icon, tint }) => (
  <View style={styles.card}>
    <SoftIcon size={34} radius={12} tint={tint}>
      <MaterialIcons name={icon} size={22} color="#fff" />
    </SoftIcon>

    <View style={styles.textContainer}>
      {!!text1 && <Text style={styles.title} numberOfLines={1}>{text1}</Text>}
      {!!text2 && <Text style={styles.message} numberOfLines={2}>{text2}</Text>}
    </View>

    <MaterialIcons name="close" size={18} color={pastel.textMuted} onPress={hideToast} />
  </View>
);

export const toastConfig = {
  success: (props) => <PastelToast {...props} icon="check" tint="purple" />,
  error: (props) => <PastelToast {...props} icon="warning" tint="pink" />,
};

const styles = StyleSheet.create({
  card: {
    width: '93%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: pastel.bgTop,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    boxShadow: '0px 4px 14px rgba(139,92,246,0.25)',
  },
  iconBubble: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: { flex: 1 },
  title: { fontSize: 14, fontWeight: '800', color: pastel.textDeep },
  message: { fontSize: 12, fontWeight: '600', color: pastel.textMuted, marginTop: 2 },
});