import React from 'react';
import ReactDOM from 'react-dom';
import {BrowserRouter as Router, Switch, Route} from 'react-router-dom';

import './index.css';

import {StoreProvider} from './context/store';
import {ThemeProvider} from './theme';

import App from './App';
import Instructions from './Instructions';

ReactDOM.render(
	<React.StrictMode>
		<ThemeProvider>
			<Router basename={process.env.PUBLIC_URL}>
				<Switch>
					<Route path="/instructions">
						<Instructions />
					</Route>
					<Route path="/">
						<StoreProvider>
							<App />
						</StoreProvider>
					</Route>
				</Switch>
			</Router>
		</ThemeProvider>
	</React.StrictMode>,
	document.getElementById('root'),
);
