import React from 'react';
import {BrainViewer} from '../brain_viewer';

export class Viewer3D extends React.Component {
    private viewer: BrainViewer = null;
    private displayCompartments = new Set<string>();
    private loadedCompartments = new Set<string>();

    private async createViewer() {
        if (this.viewer !== null)
            return;

        const v = new BrainViewer();
        v.container = 'viewer-container'; // create this div in render()
        v.initialize();
        this.viewer = v;
    }

    private loadAndDisplayCompartment(id: string) {
        if (!this.loadedCompartments.has(id)) {

        }
    }

    private renderCompartments() {
        if (this.viewer === null)
            return;

        if (!this.loadedCompartments.has('root')) {
            this.viewer.loadCompartment('root', 997, '878787');
            this.viewer.setCompartmentVisible('root', true);
        }
    }

    public componentDidMount() {
        this.createViewer();
        this.renderCompartments();
    }

    public render() {
        return <div id='viewer-container'/>
    }
}