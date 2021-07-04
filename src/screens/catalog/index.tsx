import React, {FunctionComponent} from 'react';
import {View} from 'react-native';
import style from './style';
import FontPrimaryText from '@components/FontPrimaryText';
import {StackNavigationOptions} from '@react-navigation/stack';
import {PanGestureHandler, State} from 'react-native-gesture-handler';

import Animated, {
  cond,
  eq,
  add,
  set,
  Value,
  block,
  and,
  stopClock,
  clockRunning,
  not,
  startClock,
  Clock,
  spring as reSpring,
  neq,
  call,
  multiply,
  abs,
  lessThan,
  greaterOrEq,
  debug,
  sub,
  greaterThan,
  decay as reDecay,
} from 'react-native-reanimated';
import {diffClamp, onGestureEvent, min} from 'react-native-redash';

const Catalog: FunctionComponent = () => {
  const state = new Value(State.UNDETERMINED);
  const translationX = new Value(0);
  const snapY = 10;
  const translationY = new Value(snapY);
  const offsetY = new Value(0);
  const velocityY = new Value(0);

  const gestureHandler = onGestureEvent({
    state,
    translationX,
    translationY,
    velocityY,
  });

  interface WithDecayProps {
    value: Animated.Adaptable<number>;
    velocity: Animated.Adaptable<number>;
    state: Animated.Value<State>;
    offset?: Animated.Value<number>;
    deceleration?: number;
  }

  const withDecay = (config: WithDecayProps) => {
    const {value, velocity, state, offset, deceleration} = {
      offset: new Value(0),
      deceleration: 0.998,
      ...config,
    };
    const clock = new Clock();
    const decayState = {
      finished: new Value(0),
      velocity: new Value(0),
      position: new Value(0),
      time: new Value(0),
    };
    const isDecayInterrupted = and(eq(state, State.BEGAN), clockRunning(clock));
    const finishDecay = [set(offset, decayState.position), stopClock(clock)];

    return block([
      cond(isDecayInterrupted, finishDecay),
      cond(neq(state, State.END), [
        set(decayState.finished, 0),
        set(decayState.position, add(offset, value)),
      ]),
      cond(eq(state, State.END), [
        cond(and(not(clockRunning(clock)), not(decayState.finished)), [
          set(decayState.velocity, velocity),
          set(decayState.time, 0),
          startClock(clock),
        ]),
        reDecay(clock, decayState, {deceleration}),
        cond(decayState.finished, finishDecay),
      ]),
      decayState.position,
    ]);
  };
  type SpringConfig = Omit<Animated.SpringConfig, 'toValue'>;

  interface WithSpringParams {
    value: Animated.Adaptable<number>;
    velocity: Animated.Adaptable<number>;
    state: Animated.Value<State>;
    snapPoints: Animated.Adaptable<number>[];
    offset?: Animated.Value<number>;
    config?: SpringConfig;
    onSnap?: (value: readonly number[]) => void;
  }

  interface PrivateSpringConfig extends Animated.SpringConfig {
    toValue: Animated.Value<number>;
  }

  const snapPoint = (
    value: Animated.Adaptable<number>,
    velocity: Animated.Adaptable<number>,
    points: Animated.Adaptable<number>[],
  ) => {
    const point = add(value, multiply(0.2, velocity));
    const diffPoint = (p: Animated.Adaptable<number>) => abs(sub(point, p));
    const deltas = points.map(p => diffPoint(p));
    const minDelta = min(...deltas);
    return points.reduce(
      (acc, p) => cond(eq(diffPoint(p), minDelta), p, acc),
      new Value(),
    );
  };

  const withSpring = (props: WithSpringParams) => {
    const {
      value,
      velocity,
      state,
      snapPoints,
      offset,
      config: springConfig,
      onSnap,
    } = {
      offset: new Value(0),
      ...props,
    };
    const clock = new Clock();
    const springState: Animated.SpringState = {
      finished: new Value(0),
      velocity: new Value(0),
      position: new Value(0),
      time: new Value(0),
    };

    const config: PrivateSpringConfig = {
      toValue: new Value(0),
      damping: 1000,
      mass: 1,
      stiffness: 60,
      overshootClamping: false,
      restSpeedThreshold: 1,
      restDisplacementThreshold: 1,
      ...springConfig,
    };

    const gestureAndAnimationIsOver = new Value(1);
    const isSpringInterrupted = and(
      eq(state, State.BEGAN),
      clockRunning(clock),
    );
    const finishSpring = [
      set(offset, springState.position),
      stopClock(clock),
      set(gestureAndAnimationIsOver, 1),
    ];
    const snap = onSnap
      ? [cond(clockRunning(clock), call([springState.position], onSnap))]
      : [];
    return block([
      cond(isSpringInterrupted, finishSpring),
      cond(gestureAndAnimationIsOver, set(springState.position, offset)),
      cond(add(neq(state, State.END)), [
        debug('maxValue', springState.position),
        set(gestureAndAnimationIsOver, 0),
        set(springState.finished, 0),
        set(springState.position, add(offset, value)),
      ]),
      cond(
        and(
          eq(state, State.END),
          not(gestureAndAnimationIsOver),
          debug('greaterOrEq', greaterThan(springState.position, 0)),
          greaterThan(springState.position, 0),
        ),
        [
          cond(and(not(clockRunning(clock)), not(springState.finished)), [
            set(springState.velocity, velocity),
            set(springState.time, 0),
            set(
              config.toValue,
              snapPoint(springState.position, velocity, snapPoints),
            ),
            startClock(clock),
          ]),
          reSpring(clock, springState, config),
          cond(springState.finished, [...snap, ...finishSpring]),
        ],
      ),
      cond(
        greaterThan(springState.position, 0),
        [debug('if', springState.position)],
        [
          set(springState.position, add(offset, value)),
          set(springState.velocity, velocity),
          set(springState.time, 0),
          set(
            config.toValue,
            snapPoint(springState.position, velocity, snapPoints),
          ),
          startClock(clock),
          cond(springState.finished, [...snap, ...finishSpring]),
        ],
      ),
      cond(lessThan(springState.position, -55), [
        debug('state state', state),
        set(springState.position, -55),
        finishSpring,
      ]),
      springState.position,
    ]);
  };

  const translateY = withSpring({
    value: translationY,
    velocity: velocityY,
    state,
    offset: offsetY,
    snapPoints: [snapY, -20],
  });

  return (
    <PanGestureHandler {...gestureHandler}>
      <Animated.View style={[{flex: 1}]}>
        <View style={style.header}>
          <FontPrimaryText>шумакова 11</FontPrimaryText>
        </View>
        <Animated.ScrollView
          scrollEnabled={false}
          style={[style.screen, {transform: [{translateY}]}]}>
          <FontPrimaryText>
            Lorem ipsum dolor sit amet, consectetur adipisicing elit. Architecto
            corporis eligendi harum incidunt ipsam laboriosam laudantium
            pariatur quisquam ut! Blanditiis dolor ea fugiat nobis omnis,
            placeat quas quo totam vero? Lorem ipsum dolor sit amet, consectetur
            adipisicing elit. Architecto corporis eligendi harum incidunt ipsam
            laboriosam laudantium pariatur quisquam ut! Blanditiis dolor ea
            fugiat nobis omnis, placeat quas quo totam vero? Lorem ipsum dolor
            sit amet, consectetur adipisicing elit. Architecto corporis eligendi
            harum incidunt ipsam laboriosam laudantium pariatur quisquam ut!
            Blanditiis dolor ea fugiat nobis omnis, placeat quas quo totam vero?
            Lorem ipsum dolor sit amet, consectetur adipisicing elit. Architecto
            corporis eligendi harum incidunt ipsam laboriosam laudantium
            pariatur quisquam ut! Blanditiis dolor ea fugiat nobis omnis,
            placeat quas quo totam vero? Lorem ipsum dolor sit amet, consectetur
            adipisicing elit. Architecto corporis eligendi harum incidunt ipsam
            laboriosam laudantium pariatur quisquam ut! Blanditiis dolor ea
            fugiat nobis omnis, placeat quas quo totam vero? Lorem ipsum dolor
            sit amet, consectetur adipisicing elit. Architecto corporis eligendi
            harum incidunt ipsam laboriosam laudantium pariatur quisquam ut!
            Blanditiis dolor ea fugiat nobis omnis, placeat quas quo totam vero?
            Lorem ipsum dolor sit amet, consectetur adipisicing elit. Architecto
            corporis eligendi harum incidunt ipsam laboriosam laudantium
            pariatur quisquam ut! Blanditiis dolor ea fugiat nobis omnis,
            placeat quas quo totam vero? Lorem ipsum dolor sit amet, consectetur
            adipisicing elit. Architecto corporis eligendi harum incidunt ipsam
            laboriosam laudantium pariatur quisquam ut! Blanditiis dolor ea
            fugiat nobis omnis, placeat quas quo totam vero? Lorem ipsum dolor
            sit amet, consectetur adipisicing elit. Architecto corporis eligendi
            harum incidunt ipsam laboriosam laudantium pariatur quisquam ut!
            Blanditiis dolor ea fugiat nobis omnis, placeat quas quo totam vero?
            Lorem ipsum dolor sit amet, consectetur adipisicing elit. Architecto
            corporis eligendi harum incidunt ipsam laboriosam laudantium
            pariatur quisquam ut! Blanditiis dolor ea fugiat nobis omnis,
            placeat quas quo totam vero? Lorem ipsum dolor sit amet, consectetur
            adipisicing elit. Architecto corporis eligendi harum incidunt ipsam
            laboriosam laudantium pariatur quisquam ut! Blanditiis dolor ea
            fugiat nobis omnis, placeat quas quo totam vero? Lorem ipsum dolor
            sit amet, consectetur adipisicing elit. Architecto corporis eligendi
            harum incidunt ipsam laboriosam laudantium pariatur quisquam ut!
            Blanditiis dolor ea fugiat nobis omnis, placeat quas quo totam vero?
            Lorem ipsum dolor sit amet, consectetur adipisicing elit. Architecto
            corporis eligendi harum incidunt ipsam laboriosam laudantium
            pariatur quisquam ut! Blanditiis dolor ea fugiat nobis omnis,
            placeat quas quo totam vero? Lorem ipsum dolor sit amet, consectetur
            adipisicing elit. Architecto corporis eligendi harum incidunt ipsam
            laboriosam laudantium pariatur quisquam ut! Blanditiis dolor ea
            fugiat nobis omnis, placeat quas quo totam vero? Lorem ipsum dolor
            sit amet, consectetur adipisicing elit. Architecto corporis eligendi
            harum incidunt ipsam laboriosam laudantium pariatur quisquam ut!
            Blanditiis dolor ea fugiat nobis omnis, placeat quas quo totam vero?
            Lorem ipsum dolor sit amet, consectetur adipisicing elit. Architecto
            corporis eligendi harum incidunt ipsam laboriosam laudantium
            pariatur quisquam ut! Blanditiis dolor ea fugiat nobis omnis,
            placeat quas quo totam vero? Lorem ipsum dolor sit amet, consectetur
            adipisicing elit. Architecto corporis eligendi harum incidunt ipsam
            laboriosam laudantium pariatur quisquam ut! Blanditiis dolor ea
            fugiat nobis omnis, placeat quas quo totam vero? Lorem ipsum dolor
            sit amet, consectetur adipisicing elit. Architecto corporis eligendi
            harum incidunt ipsam laboriosam laudantium pariatur quisquam ut!
            Blanditiis dolor ea fugiat nobis omnis, placeat quas quo totam vero?
            Lorem ipsum dolor sit amet, consectetur adipisicing elit. Architecto
            corporis eligendi harum incidunt ipsam laboriosam laudantium
            pariatur quisquam ut! Blanditiis dolor ea fugiat nobis omnis,
            placeat quas quo totam vero? Lorem ipsum dolor sit amet, consectetur
            adipisicing elit. Architecto corporis eligendi harum incidunt ipsam
            laboriosam laudantium pariatur quisquam ut! Blanditiis dolor ea
            fugiat nobis omnis, placeat quas quo totam vero? Lorem ipsum dolor
            sit amet, consectetur adipisicing elit. Architecto corporis eligendi
            harum incidunt ipsam laboriosam laudantium pariatur quisquam ut!
            Blanditiis dolor ea fugiat nobis omnis, placeat quas quo totam vero?
            Lorem ipsum dolor sit amet, consectetur adipisicing elit. Architecto
            corporis eligendi harum incidunt ipsam laboriosam laudantium
            pariatur quisquam ut! Blanditiis dolor ea fugiat nobis omnis,
            placeat quas quo totam vero? Lorem ipsum dolor sit amet, consectetur
            adipisicing elit. Architecto corporis eligendi harum incidunt ipsam
            laboriosam laudantium pariatur quisquam ut! Blanditiis dolor ea
            fugiat nobis omnis, placeat quas quo totam vero? Lorem ipsum dolor
            sit amet, consectetur adipisicing elit. Architecto corporis eligendi
            harum incidunt ipsam laboriosam laudantium pariatur quisquam ut!
            Blanditiis dolor ea fugiat nobis omnis, placeat quas quo totam vero?
            Lorem ipsum dolor sit amet, consectetur adipisicing elit. Architecto
            corporis eligendi harum incidunt ipsam laboriosam laudantium
            pariatur quisquam ut! Blanditiis dolor ea fugiat nobis omnis,
            placeat quas quo totam vero? Lorem ipsum dolor sit amet, consectetur
            adipisicing elit. Architecto corporis eligendi harum incidunt ipsam
            laboriosam laudantium pariatur quisquam ut! Blanditiis dolor ea
            fugiat nobis omnis, placeat quas quo totam vero? Lorem ipsum dolor
            sit amet, consectetur adipisicing elit. Architecto corporis eligendi
            harum incidunt ipsam laboriosam laudantium pariatur quisquam ut!
            Blanditiis dolor ea fugiat nobis omnis, placeat quas quo totam vero?
            Lorem ipsum dolor sit amet, consectetur adipisicing elit. Architecto
            corporis eligendi harum incidunt ipsam laboriosam laudantium
            pariatur quisquam ut! Blanditiis dolor ea fugiat nobis omnis,
            placeat quas quo totam vero? Lorem ipsum dolor sit amet, consectetur
            adipisicing elit. Architecto corporis eligendi harum incidunt ipsam
            laboriosam laudantium pariatur quisquam ut! Blanditiis dolor ea
            fugiat nobis omnis, placeat quas quo totam vero? Lorem ipsum dolor
            sit amet, consectetur adipisicing elit. Architecto corporis eligendi
            harum incidunt ipsam laboriosam laudantium pariatur quisquam ut!
            Blanditiis dolor ea fugiat nobis omnis, placeat quas quo totam vero?
            Lorem ipsum dolor sit amet, consectetur adipisicing elit. Architecto
            corporis eligendi harum incidunt ipsam laboriosam laudantium
            pariatur quisquam ut! Blanditiis dolor ea fugiat nobis omnis,
            placeat quas quo totam vero? Lorem ipsum dolor sit amet, consectetur
            adipisicing elit. Architecto corporis eligendi harum incidunt ipsam
            laboriosam laudantium pariatur quisquam ut! Blanditiis dolor ea
            fugiat nobis omnis, placeat quas quo totam vero? Lorem ipsum dolor
            sit amet, consectetur adipisicing elit. Architecto corporis eligendi
            harum incidunt ipsam laboriosam laudantium pariatur quisquam ut!
            Blanditiis dolor ea fugiat nobis omnis, placeat quas quo totam vero?
            Lorem ipsum dolor sit amet, consectetur adipisicing elit. Architecto
            corporis eligendi harum incidunt ipsam laboriosam laudantium
            pariatur quisquam ut! Blanditiis dolor ea fugiat nobis omnis,
            placeat quas quo totam vero? Lorem ipsum dolor sit amet, consectetur
            adipisicing elit. Architecto corporis eligendi harum incidunt ipsam
            laboriosam laudantium pariatur quisquam ut! Blanditiis dolor ea
            fugiat nobis omnis, placeat quas quo totam vero? Lorem ipsum dolor
            sit amet, consectetur adipisicing elit. Architecto corporis eligendi
            harum incidunt ipsam laboriosam laudantium pariatur quisquam ut!
            Blanditiis dolor ea fugiat nobis omnis, placeat quas quo totam vero?
            Lorem ipsum dolor sit amet, consectetur adipisicing elit. Architecto
            corporis eligendi harum incidunt ipsam laboriosam laudantium
            pariatur quisquam ut! Blanditiis dolor ea fugiat nobis omnis,
            placeat quas quo totam vero? Lorem ipsum dolor sit amet, consectetur
            adipisicing elit. Architecto corporis eligendi harum incidunt ipsam
            laboriosam laudantium pariatur quisquam ut! Blanditiis dolor ea
            fugiat nobis omnis, placeat quas quo totam vero? Lorem ipsum dolor
            sit amet, consectetur adipisicing elit. Architecto corporis eligendi
            harum incidunt ipsam laboriosam laudantium pariatur quisquam ut!
            Blanditiis dolor ea fugiat nobis omnis, placeat quas quo totam vero?
            Lorem ipsum dolor sit amet, consectetur adipisicing elit. Architecto
            corporis eligendi harum incidunt ipsam laboriosam laudantium
            pariatur quisquam ut! Blanditiis dolor ea fugiat nobis omnis,
            placeat quas quo totam vero? Lorem ipsum dolor sit amet, consectetur
            adipisicing elit. Architecto corporis eligendi harum incidunt ipsam
            laboriosam laudantium pariatur quisquam ut! Blanditiis dolor ea
            fugiat nobis omnis, placeat quas quo totam vero? Lorem ipsum dolor
            sit amet, consectetur adipisicing elit. Architecto corporis eligendi
            harum incidunt ipsam laboriosam laudantium pariatur quisquam ut!
            Blanditiis dolor ea fugiat nobis omnis, placeat quas quo totam vero?
            Lorem ipsum dolor sit amet, consectetur adipisicing elit. Architecto
            corporis eligendi harum incidunt ipsam laboriosam laudantium
            pariatur quisquam ut! Blanditiis dolor ea fugiat nobis omnis,
            placeat quas quo totam vero? Lorem ipsum dolor sit amet, consectetur
            adipisicing elit. Architecto corporis eligendi harum incidunt ipsam
            laboriosam laudantium pariatur quisquam ut! Blanditiis dolor ea
            fugiat nobis omnis, placeat quas quo totam vero? Lorem ipsum dolor
            sit amet, consectetur adipisicing elit. Architecto corporis eligendi
            harum incidunt ipsam laboriosam laudantium pariatur quisquam ut!
            Blanditiis dolor ea fugiat nobis omnis, placeat quas quo totam vero?
            Lorem ipsum dolor sit amet, consectetur adipisicing elit. Architecto
            corporis eligendi harum incidunt ipsam laboriosam laudantium
            pariatur quisquam ut! Blanditiis dolor ea fugiat nobis omnis,
            placeat quas quo totam vero? Lorem ipsum dolor sit amet, consectetur
            adipisicing elit. Architecto corporis eligendi harum incidunt ipsam
            laboriosam laudantium pariatur quisquam ut! Blanditiis dolor ea
            fugiat nobis omnis, placeat quas quo totam vero? Lorem ipsum dolor
            sit amet, consectetur adipisicing elit. Architecto corporis eligendi
            harum incidunt ipsam laboriosam laudantium pariatur quisquam ut!
            Blanditiis dolor ea fugiat nobis omnis, placeat quas quo totam vero?
            Lorem ipsum dolor sit amet, consectetur adipisicing elit. Architecto
            corporis eligendi harum incidunt ipsam laboriosam laudantium
            pariatur quisquam ut! Blanditiis dolor ea fugiat nobis omnis,
            placeat quas quo totam vero? Lorem ipsum dolor sit amet, consectetur
            adipisicing elit. Architecto corporis eligendi harum incidunt ipsam
            laboriosam laudantium pariatur quisquam ut! Blanditiis dolor ea
            fugiat nobis omnis, placeat quas quo totam vero? Lorem ipsum dolor
            sit amet, consectetur adipisicing elit. Architecto corporis eligendi
            harum incidunt ipsam laboriosam laudantium pariatur quisquam ut!
            Blanditiis dolor ea fugiat nobis omnis, placeat quas quo totam vero?
            Lorem ipsum dolor sit amet, consectetur adipisicing elit. Architecto
            corporis eligendi harum incidunt ipsam laboriosam laudantium
            pariatur quisquam ut! Blanditiis dolor ea fugiat nobis omnis,
            placeat quas quo totam vero? Lorem ipsum dolor sit amet, consectetur
            adipisicing elit. Architecto corporis eligendi harum incidunt ipsam
            laboriosam laudantium pariatur quisquam ut! Blanditiis dolor ea
            fugiat nobis omnis, placeat quas quo totam vero? Lorem ipsum dolor
            sit amet, consectetur adipisicing elit. Architecto corporis eligendi
            harum incidunt ipsam laboriosam laudantium pariatur quisquam ut!
            Blanditiis dolor ea fugiat nobis omnis, placeat quas quo totam vero?
            Lorem ipsum dolor sit amet, consectetur adipisicing elit. Architecto
            corporis eligendi harum incidunt ipsam laboriosam laudantium
            pariatur quisquam ut! Blanditiis dolor ea fugiat nobis omnis,
            placeat quas quo totam vero? Lorem ipsum dolor sit amet, consectetur
            adipisicing elit. Architecto corporis eligendi harum incidunt ipsam
            laboriosam laudantium pariatur quisquam ut! Blanditiis dolor ea
            fugiat nobis omnis, placeat quas quo totam vero? Lorem ipsum dolor
            sit amet, consectetur adipisicing elit. Architecto corporis eligendi
            harum incidunt ipsam laboriosam laudantium pariatur quisquam ut!
            Blanditiis dolor ea fugiat nobis omnis, placeat quas quo totam vero?
            Lorem ipsum dolor sit amet, consectetur adipisicing elit. Architecto
            corporis eligendi harum incidunt ipsam laboriosam laudantium
            pariatur quisquam ut! Blanditiis dolor ea fugiat nobis omnis,
            placeat quas quo totam vero? Lorem ipsum dolor sit amet, consectetur
            adipisicing elit. Architecto corporis eligendi harum incidunt ipsam
            laboriosam laudantium pariatur quisquam ut! Blanditiis dolor ea
            fugiat nobis omnis, placeat quas quo totam vero? Lorem ipsum dolor
            sit amet, consectetur adipisicing elit. Architecto corporis eligendi
            harum incidunt ipsam laboriosam laudantium pariatur quisquam ut!
            Blanditiis dolor ea fugiat nobis omnis, placeat quas quo totam vero?
            Lorem ipsum dolor sit amet, consectetur adipisicing elit. Architecto
            corporis eligendi harum incidunt ipsam laboriosam laudantium
            pariatur quisquam ut! Blanditiis dolor ea fugiat nobis omnis,
            placeat quas quo totam vero? Lorem ipsum dolor sit amet, consectetur
            adipisicing elit. Architecto corporis eligendi harum incidunt ipsam
            laboriosam laudantium pariatur quisquam ut! Blanditiis dolor ea
            fugiat nobis omnis, placeat quas quo totam vero? Lorem ipsum dolor
            sit amet, consectetur adipisicing elit. Architecto corporis eligendi
            harum incidunt ipsam laboriosam laudantium pariatur quisquam ut!
            Blanditiis dolor ea fugiat nobis omnis, placeat quas quo totam vero?
            Lorem ipsum dolor sit amet, consectetur adipisicing elit. Architecto
            corporis eligendi harum incidunt ipsam laboriosam laudantium
            pariatur quisquam ut! Blanditiis dolor ea fugiat nobis omnis,
            placeat quas quo totam vero? Lorem ipsum dolor sit amet, consectetur
            adipisicing elit. Architecto corporis eligendi harum incidunt ipsam
            laboriosam laudantium pariatur quisquam ut! Blanditiis dolor ea
            fugiat nobis omnis, placeat quas quo totam vero? Lorem ipsum dolor
            sit amet, consectetur adipisicing elit. Architecto corporis eligendi
            harum incidunt ipsam laboriosam laudantium pariatur quisquam ut!
            Blanditiis dolor ea fugiat nobis omnis, placeat quas quo totam vero?
            Lorem ipsum dolor sit amet, consectetur adipisicing elit. Architecto
            corporis eligendi harum incidunt ipsam laboriosam laudantium
            pariatur quisquam ut! Blanditiis dolor ea fugiat nobis omnis,
            placeat quas quo totam vero? Lorem ipsum dolor sit amet, consectetur
            adipisicing elit. Architecto corporis eligendi harum incidunt ipsam
            laboriosam laudantium pariatur quisquam ut! Blanditiis dolor ea
            fugiat nobis omnis, placeat quas quo totam vero? Lorem ipsum dolor
            sit amet, consectetur adipisicing elit. Architecto corporis eligendi
            harum incidunt ipsam laboriosam laudantium pariatur quisquam ut!
            Blanditiis dolor ea fugiat nobis omnis, placeat quas quo totam vero?
            Lorem ipsum dolor sit amet, consectetur adipisicing elit. Architecto
            corporis eligendi harum incidunt ipsam laboriosam laudantium
            pariatur quisquam ut! Blanditiis dolor ea fugiat nobis omnis,
            placeat quas quo totam vero? Lorem ipsum dolor sit amet, consectetur
            adipisicing elit. Architecto corporis eligendi harum incidunt ipsam
            laboriosam laudantium pariatur quisquam ut! Blanditiis dolor ea
            fugiat nobis omnis, placeat quas quo totam vero? Lorem ipsum dolor
            sit amet, consectetur adipisicing elit. Architecto corporis eligendi
            harum incidunt ipsam laboriosam laudantium pariatur quisquam ut!
            Blanditiis dolor ea fugiat nobis omnis, placeat quas quo totam vero?
            Lorem ipsum dolor sit amet, consectetur adipisicing elit. Architecto
            corporis eligendi harum incidunt ipsam laboriosam laudantium
            pariatur quisquam ut! Blanditiis dolor ea fugiat nobis omnis,
            placeat quas quo totam vero? Lorem ipsum dolor sit amet, consectetur
            adipisicing elit. Architecto corporis eligendi harum incidunt ipsam
            laboriosam laudantium pariatur quisquam ut! Blanditiis dolor ea
            fugiat nobis omnis, placeat quas quo totam vero? Lorem ipsum dolor
            sit amet, consectetur adipisicing elit. Architecto corporis eligendi
            harum incidunt ipsam laboriosam laudantium pariatur quisquam ut!
            Blanditiis dolor ea fugiat nobis omnis, placeat quas quo totam vero?
            Lorem ipsum dolor sit amet, consectetur adipisicing elit. Architecto
            corporis eligendi harum incidunt ipsam laboriosam laudantium
            pariatur quisquam ut! Blanditiis dolor ea fugiat nobis omnis,
            placeat quas quo totam vero? Lorem ipsum dolor sit amet, consectetur
            adipisicing elit. Architecto corporis eligendi harum incidunt ipsam
            laboriosam laudantium pariatur quisquam ut! Blanditiis dolor ea
            fugiat nobis omnis, placeat quas quo totam vero? Lorem ipsum dolor
            sit amet, consectetur adipisicing elit. Architecto corporis eligendi
            harum incidunt ipsam laboriosam laudantium pariatur quisquam ut!
            Blanditiis dolor ea fugiat nobis omnis, placeat quas quo totam vero?
            Lorem ipsum dolor sit amet, consectetur adipisicing elit. Architecto
            corporis eligendi harum incidunt ipsam laboriosam laudantium
            pariatur quisquam ut! Blanditiis dolor ea fugiat nobis omnis,
            placeat quas quo totam vero? Lorem ipsum dolor sit amet, consectetur
            adipisicing elit. Architecto corporis eligendi harum incidunt ipsam
            laboriosam laudantium pariatur quisquam ut! Blanditiis dolor ea
            fugiat nobis omnis, placeat quas quo totam vero?
          </FontPrimaryText>
        </Animated.ScrollView>
      </Animated.View>
    </PanGestureHandler>
  );
};

const screenOption: StackNavigationOptions = {
  headerShown: false,
};

export {screenOption};
export default Catalog;
