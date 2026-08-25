import {useEffect} from 'react';

import {useStore, undo, redo} from '../context/store';

export default function UndoRedo() {
	const [, dispatch, {canUndo, canRedo}] = useStore();

	useEffect(
		() => {
			function onKeyDown(event: KeyboardEvent) {
				// Leave text inputs to the browser's own undo
				const target = event.target as HTMLElement;
				if (
					['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
				) {
					return;
				}
				if (!event.metaKey && !event.ctrlKey) {
					return;
				}

				const key = event.key.toLowerCase();
				if (key === 'z') {
					event.preventDefault();
					dispatch(event.shiftKey ? redo() : undo());
				} else if (key === 'y') {
					event.preventDefault();
					dispatch(redo());
				}
			}

			window.addEventListener('keydown', onKeyDown);
			return () => window.removeEventListener('keydown', onKeyDown);
		},
		[dispatch],
	);

	return (
		<div className="UndoRedo">
			<button
				disabled={!canUndo}
				onClick={() => dispatch(undo())}
				title="Undo (Ctrl/Cmd+Z)"
			>
				&#8630; Undo
			</button>
			<button
				disabled={!canRedo}
				onClick={() => dispatch(redo())}
				title="Redo (Ctrl/Cmd+Shift+Z)"
			>
				&#8631; Redo
			</button>
		</div>
	);
}
