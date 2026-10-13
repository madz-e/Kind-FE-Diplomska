// components/home/TalkSwitch.jsx
import React, { useEffect, useRef } from 'react';
import { Pressable, Animated, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { pastel } from '@/components';

const TRACK_WIDTH = 56;
const TRACK_HEIGHT = 32;
const THUMB_SIZE = 26;
const THUMB_MARGIN = 3;

const TalkSwitch = ({ value, onValueChange, disabled }) => {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: value ? 1 : 0,
      useNativeDriver: false, // color/layout interpolation isn't supported by native driver
      friction: 7,
      tension: 60,
    }).start();
  }, [value]);

  const trackColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [pastel.purple, pastel.pink],
  });

  const thumbTranslate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [THUMB_MARGIN, TRACK_WIDTH - THUMB_SIZE - THUMB_MARGIN],
  });

  return (
    <Pressable onPress={() => !disabled && onValueChange(!value)} disabled={disabled}>
      <Animated.View style={[styles.track, { backgroundColor: trackColor, opacity: disabled ? 0.6 : 1 }]}>
        <Animated.View style={[styles.thumb, { transform: [{ translateX: thumbTranslate }] }]}>
          <MaterialCommunityIcons
            name={value ? 'heart' : 'heart-outline'}
            size={16}
            color={value ? pastel.pink : pastel.purple}
          />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    justifyContent: 'center',
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
});

export default TalkSwitch;