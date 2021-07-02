import * as React from 'react';
import {createStackNavigator} from '@react-navigation/stack';

import CatalogScreen, {screenOption} from '../screens/catalog/index';

const ScreensCatalogNavigation = createStackNavigator();

const ScreensCatalog = () => {
  return (
    <ScreensCatalogNavigation.Navigator>
      <ScreensCatalogNavigation.Screen
        name="Catalog"
        options={screenOption}
        component={CatalogScreen}
      />
    </ScreensCatalogNavigation.Navigator>
  );
};
export default ScreensCatalog;
