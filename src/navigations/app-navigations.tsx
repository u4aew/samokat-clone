import React, {FunctionComponent} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import CatalogNavigation from './catalog-navigation';
const AppNavigator: FunctionComponent = () => {
  return (
    <NavigationContainer>
      <CatalogNavigation />
    </NavigationContainer>
  );
};

export default AppNavigator;
