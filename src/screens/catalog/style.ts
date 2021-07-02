import {StyleSheet} from 'react-native';
import {getStatusBarHeight} from 'react-native-status-bar-height';
import ui from '@const/ui';
const style = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: getStatusBarHeight() + 20,
    paddingBottom: 20,
    backgroundColor: ui.background,
  },
  screen: {
    paddingHorizontal: 20,
    flex: 1,
    backgroundColor: 'white',
    paddingTop: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 80,
  },
});

export default style;
