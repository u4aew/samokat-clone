import React, {FunctionComponent} from 'react';
import {ScrollView, View} from 'react-native';
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
  neq,
  decay as reDecay,
} from 'react-native-reanimated';
import {diffClamp, onGestureEvent} from 'react-native-redash';

const Catalog: FunctionComponent = () => {
  const state = new Value(State.UNDETERMINED);
  const translationX = new Value(0);
  const translationY = new Value(0);
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
  const translateY = diffClamp(
    withDecay({
      value: translationY,
      velocity: velocityY,
      state,
      offset: offsetY,
    }),
    -55,
    200,
  );

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
