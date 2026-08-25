import {Link} from 'react-router-dom';

import './App.css';

import AutoLayout from './ui/AutoLayout';
import CutterSettings from './ui/CutterSettings';
import GuideSettings from './ui/GuideSettings';
import GlobalSettings from './ui/GlobalSettings';
import MaterialSettings from './ui/MaterialSettings';
import HalfPinEditor from './ui/HalfPinEditor';
import Mirror from './ui/Mirror';
import PinCreator from './ui/PinCreator';
import PinEditor from './ui/PinEditor';
import ThemeSelector from './ui/ThemeSelector';
import UndoRedo from './ui/UndoRedo';
import Generate from './ui/Generate';
import Preview3D from './visualize/Preview3D';
import Visualizer from './visualize/Visualizer';

export default function App() {
	return (
		<div className="App">
			<header className="App-header">
				Dovetail Generator
				<UndoRedo />
			</header>
			<div className="Body">
				<div className="BodyLeft">
					<GlobalSettings />
					<CutterSettings />
					<MaterialSettings />
					<GuideSettings />
					<AutoLayout />
					<Mirror />
					<Generate />
				</div>
				<div className="BodyRight">
					<Visualizer />
					<Preview3D />
					<div className="VisualizerTray">
						<PinCreator />
						<PinEditor />
						<HalfPinEditor />
					</div>
				</div>
			</div>
			<div className="Footer">
				<ul>
					<li>
						&copy; 2021, Robert Bieber
						{' & '}
						&copy; 2026,{' '}
						<a href="https://github.com/bionicbeagle">
							@bionicbeagle
						</a>
					</li>
					<li>
						<a href="https://www.github.com/bionicbeagle/dovetails/">
							Source code on Github
						</a>
					</li>
					<li>
						<Link to="/instructions">Instructions</Link>
					</li>
					<li>
						<ThemeSelector />
					</li>
				</ul>
			</div>
		</div>
	);
}
