import React from 'react';
import * as _ from 'underscore';

import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';

import { APIClient } from '../../apiClient';
import { BrainViewer } from '../../brainViewer';
import { AVConstants } from '../../constants';

import { SettingsData, PenetrationData, ICompartmentNode, ICompartment } from '../../models/apiModels';

import { IAesthetics } from '../../viewmodels/aestheticMapping';
import { ICompartmentNodeView } from '../../viewmodels/compartmentViewModel';
import { PenetrationViewModel } from '../../viewmodels/penetrationViewModel';


export interface IViewer3DProps {
    aesthetics: IAesthetics[],
    availablePenetrations: PenetrationData[],
    canvasId: string,
    constants: AVConstants,
    compartmentViewTree: ICompartmentNodeView,
    frameRate: number,
    isPlaying: boolean,
    loopAnimation: 'once' | 'repeat',
    settings: SettingsData,
    timeMin: number,
    timeMax: number,
    timeStep: number,
    timeVal: number,
}

interface IViewer3DState {
    renderWidth: number,
    renderHeight: number,
}

export class Viewer3D extends React.Component<IViewer3DProps, IViewer3DState> {
    private apiClient: APIClient;
    private viewer: BrainViewer;

    constructor(props: IViewer3DProps) {
        super(props);

        this.state = {
            renderWidth: 0,
            renderHeight: 0,
        };

        this.apiClient = new APIClient(this.props.constants.apiEndpoint);
        this.viewer = null;
    }

    private computeDims() {
        const container = document.getElementById(this.props.canvasId);
        if (!container) {
            return { width: 0, height: 0 };
        }

        let width = container.clientWidth;
        let height = width / 1.85; // 1.85:1 aspect ratio

        return { width, height };
    }

    private async createViewer3D() {
        if (this.viewer !== null) {
            return;
        }

        const { width, height } = this.computeDims();
        const v = new BrainViewer(this.props.constants, this.props.settings.epochs);

        v.container = this.props.canvasId; // div is created in render()
        v.WIDTH = width;
        v.HEIGHT = height;

        v.initialize();
        v.animate();

        this.viewer = v;
    }

    private renderPenetrations() {
        this.props.availablePenetrations.forEach((penetration: PenetrationData) => {
            if (penetration.ids.length == 0) {
                return;
            }

            if (!this.viewer.hasPenetration(penetration.penetrationId)) {
                this.viewer.loadPenetration(penetration);
            }

            // find aesthetics for this penetration
            let aesthetics: IAesthetics = null;
            for (let i = 0; i < this.props.aesthetics.length; i++) {
                const mapping = this.props.aesthetics[i];
                if (mapping.penetrationId == penetration.penetrationId) {
                    aesthetics = mapping;
                }
            }

            if (aesthetics === null) {
                return;
            }

            // create a view model for this penetration
            const viewModel = new PenetrationViewModel(aesthetics, penetration.ids.length);
            this.viewer.setAesthetics(penetration.penetrationId, viewModel);
        });

        this.viewer.updatePenetrationAesthetics();
    }

    private renderCompartments() {
        if (this.viewer === null) {
            return;
        }

        // traverse the compartment tree and set visible or invisible
        let queue: ICompartmentNodeView[] = [this.props.compartmentViewTree];
        while (queue.length > 0) {
            let compartmentNodeView: ICompartmentNodeView = queue.splice(0, 1)[0];
            this.viewer.setCompartmentVisible(compartmentNodeView);
            queue = queue.concat(compartmentNodeView.children);
        }
    }

    private updateDims() {
        const { width, height } = this.computeDims();
        this.setState({ renderWidth: width, renderHeight: height });

        if (this.viewer !== null) {
            this.viewer.setSize(width, height);
        }
    }

    public componentDidMount() {
        window.addEventListener('resize', () => this.updateDims());

        this.createViewer3D()
            .then(() => {
                this.renderCompartments();
                this.renderPenetrations();
            });
    }

    public componentDidUpdate(prevProps: Readonly<IViewer3DProps>) {
        if (this.props.timeVal !== prevProps.timeVal) {
            this.viewer.timeVal = this.props.timeVal;
        }

        if (prevProps.compartmentViewTree !== this.props.compartmentViewTree) {
            this.renderCompartments();
        }

        this.renderPenetrations();
    }

    public render() {
        return (
            <Grid container
                  direction='column'
                  spacing={3}
                  style={{ padding: 40 }}
                  id='container-container'>
                <Grid item id={this.props.canvasId} xs />
            </Grid>
        )
    }
}
