import { registerRootComponent } from 'expo';
import { enableFreeze } from 'react-native-screens';

import { setupGlobalErrorLogging } from './src/debug/setupGlobalErrorLogging';

enableFreeze(true);
setupGlobalErrorLogging();

import App from './App';

registerRootComponent(App);
