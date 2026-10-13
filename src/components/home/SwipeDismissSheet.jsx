import React, { useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, Modal, Animated, Dimensions, PanResponder, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { pastel } from '@/components';

const { height: SCREEN_H } = Dimensions.get('window');

// backgroundColors (optional): gradient for the panel, e.g. ['#EEF8F6', '#DDF0EE']
// handleColor (optional): color of the grab bar
const SwipeDismissSheet = ({ visible, onClose, children, backgroundColors, handleColor }) => {
  const translateY = useRef(new Animated.Value(SCREEN_H)).current;

  useEffect(() => {
    if (visible) {
      translateY.setValue(SCREEN_H);
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
    }
  }, [visible, translateY]);

  const dismiss = useCallback(() => {
    Animated.timing(translateY, { toValue: SCREEN_H, duration: 220, useNativeDriver: true })
      .start(() => onClose());
  }, [translateY, onClose]);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => { if (g.dy > 0) translateY.setValue(g.dy); },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 110 || g.vy > 1.1) {
          dismiss();
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
        }
      },
    })
  ).current;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          {backgroundColors && (
            <LinearGradient
              colors={backgroundColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
          )}
          <View {...pan.panHandlers} style={styles.grabZone}>
            <View style={[styles.handle, handleColor && { backgroundColor: handleColor }]} />
          </View>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(59,46,85,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: pastel.bgTop,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 20, maxHeight: '85%',
    overflow: 'hidden',
  },
  grabZone: { paddingTop: 8, paddingBottom: 12, alignItems: 'center' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(183,156,242,0.45)' },
});

export default SwipeDismissSheet;