import React, {FunctionComponent} from 'react';
import {StyleSheet, Text} from 'react-native';

const FontPrimaryText: FunctionComponent = ({children}) => {
  return <Text style={style.text}>{children}</Text>;
};

const style = StyleSheet.create({
  text: {
    fontFamily: 'EuclidCircularA-Regular',
  },
});

export default FontPrimaryText;
