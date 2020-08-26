import React from 'react';
import * as _ from 'underscore';

import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';

import { APIClient } from '../../apiClient';
import { BrainViewer } from '../../brainViewer';
import { AVConstants } from '../../constants';

import { ISettingsResponse, IPenetrationData, ICompartmentNode, ICompartment } from '../../models/apiModels';
import { CompartmentTree } from '../../models/compartmentTree';

import { IAesthetics } from '../../viewmodels/aestheticMapping';
import { ICompartmentView } from '../../viewmodels/compartmentViewModel';
import { PenetrationViewModel } from '../../viewmodels/penetrationViewModel';

import { CompartmentListContainer, ICompartmentListContainerProps } from './CompartmentListContainer';
import { PlayerSlider, IPlayerSliderProps } from '../PlayerSlider';


export interface IViewer3DProps {
    aestheticMappings: IAesthetics[],
    availablePenetrations: IPenetrationData[],
    constants: AVConstants,
    compartmentTree: CompartmentTree,
    settings: ISettingsResponse,
    visibleCompartments: ICompartmentView[],
    updateCompartments(compartments: ICompartmentView[]): void,
}

interface IViewer3DState {
    frameRate: number,
    isPlaying: boolean,
    loopAnimation: 'once' | 'repeat',
    renderWidth: number,
    renderHeight: number,
    timeMin: number,
    timeMax: number,
    timeStep: number,
    timeVal: number,
}

export class Viewer3D extends React.Component<IViewer3DProps, IViewer3DState> {
    private apiClient: APIClient;
    private containerId = 'viewer-container';
    private viewer: BrainViewer;

    constructor(props: IViewer3DProps) {
        super(props);

        this.state = {
            frameRate: 10,
            isPlaying: false,
            loopAnimation: 'once',
            renderWidth: 0,
            renderHeight: 0,
            timeMin: 0,
            timeMax: 0,
            timeStep: 0.01,
            timeVal: 0,
        };

        this.apiClient = new APIClient(this.props.constants.apiEndpoint);
        this.viewer = null;
    }

    private animate() {
        if (this.state.isPlaying) {
            const newVal = this.state.timeVal + this.state.timeStep > this.state.timeMax ?
                            this.state.timeMin : this.state.timeVal + this.state.timeStep;
            
            if (newVal === this.state.timeMin && this.state.loopAnimation === 'once') {
                this.setState({ timeVal: this.state.timeMin, isPlaying: false }, () => {
                    this.viewer.timeVal = this.state.timeMin;
                });
            } else {
                this.setState({ timeVal: newVal }, () => {
                    this.viewer.timeVal = this.state.timeVal;
                    setTimeout(this.animate.bind(this), 1000/this.state.frameRate);
                })
            }
        }
    }

    private computeDims() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            return { width: 0, height: 0 };
        }

        let width = container.clientWidth;
        let height = 0.75 * width; // 4:3 aspect ratio

        return { width, height };
    }

    private async createViewer() {
        if (this.viewer !== null) {
            return;
        }

        const { width, height } = this.computeDims();
        const v = new BrainViewer(this.props.constants, this.props.compartmentTree);

        v.container = this.containerId; // div is created in render()
        v.WIDTH = width;
        v.HEIGHT = height;

        v.initialize();
        v.animate();

        this.viewer = v;
    }

    private handleFrameRateUpdate(frameRate: number) {
        this.setState({ frameRate: Math.max(Math.min(frameRate, 60), 1) });
    }

    private handleLoopToggle() {
        const newLoop = this.state.loopAnimation === 'once' ? 'repeat' : 'once';
        this.setState({ loopAnimation: newLoop });
    }

    private handlePlayToggle() {
        this.setState({ isPlaying: !this.state.isPlaying }, () => {
            this.animate();
        });
    }

    private handleSliderChange(_event: any, timeVal: number) {
        this.setState({ timeVal }, () => {
            this.viewer.timeVal = this.state.timeVal
        });
    }

    private handleStopClick() {
        this.setState({ timeVal: this.state.timeMin, isPlaying: false }, () => {
            this.viewer.timeVal = this.state.timeMin;
        });
    }

    private populateCompartments() {
        const compartmentNodes = this.props.compartmentTree
            .getCompartmentSubset(this.props.settings);

        // create views for all compartments
        let visibleCompartments: ICompartmentView[] = [];
        compartmentNodes.forEach((node: ICompartmentNode) => {
            visibleCompartments.push(
                _.extend(
                    _.pick(node, _.without(_.keys(node), 'children')) as ICompartment,
                    {isVisible: node.id === this.props.constants.rootId}
                )
            );
        });

        this.props.updateCompartments(visibleCompartments);
    }

    private renderPenetrations() {
        let timeMin = 0;
        let timeMax = 0;

        this.props.availablePenetrations.forEach((penetration: IPenetrationData) => {
            if (penetration.ids.length == 0) {
                return;
            }

            if (!this.viewer.hasPenetration(penetration.penetrationId)) {
                this.viewer.loadPenetration(penetration);
            }

            // find aesthetics for this penetration
            let aesthetics: IAesthetics = null;
            for (let i = 0; i < this.props.aestheticMappings.length; i++) {
                const mapping = this.props.aestheticMappings[i];
                if (mapping.penetrationId == penetration.penetrationId) {
                    aesthetics = mapping;
                }
            }

            if (aesthetics === null) {
                return;
            }

            if (aesthetics.radius !== null) {
                const rTimes = aesthetics.radius.times;
                timeMin = Math.min(timeMin, rTimes[0]);
                timeMax = Math.max(timeMax, rTimes[rTimes.length - 1]);
            }

            if (aesthetics.color !== null) {
                const cTimes = aesthetics.color.times;
                timeMin = Math.min(timeMin, cTimes[0]);
                timeMax = Math.max(timeMax, cTimes[cTimes.length - 1]);
            }

            if (aesthetics.opacity !== null) {
                const oTimes = aesthetics.opacity.times;
                timeMin = Math.min(timeMin, oTimes[0]);
                timeMax = Math.max(timeMax, oTimes[oTimes.length - 1]);
            }

            // create a view model for this penetration
            const viewModel = new PenetrationViewModel(aesthetics, penetration.ids.length);
            this.viewer.setAesthetics(penetration.penetrationId, viewModel);
        });

        if (timeMin !== this.state.timeMin || timeMax !== this.state.timeMax) {
            this.setState({
                timeMin: timeMin,
                timeVal: timeMin,
                timeMax: timeMax
            });
        }

        this.viewer.updatePenetrationAesthetics();
    }

    private renderCompartments() {
        if (this.viewer === null) {
            return;
        }

        this.props.visibleCompartments.forEach((compartmentView: ICompartmentView) => {
            this.viewer.setCompartmentVisible(compartmentView.name, compartmentView.isVisible);
        });
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

        this.createViewer()
            .then(() => {
                this.populateCompartments();
                this.renderPenetrations();
            });
    }

    public componentDidUpdate() {
        this.renderCompartments();
        this.renderPenetrations();
    }

    public render() {
        // const compartmentListContainerProps: ICompartmentListContainerProps = {
        //     compartmentTree: this.props.compartmentTree,
        //     rootNode: this.state.rootNode,
        //     visibleCompartments: this.props.visibleCompartments,
        //     onToggleSubsetOnly: this.handleToggleSubsetOnly.bind(this),
        //     onUpdateSelectedCompartments: this.props.onUpdateSelectedCompartments,
        // };
        
        const playerSliderProps: IPlayerSliderProps = {
            frameRate: this.state.frameRate,
            isPlaying: this.state.isPlaying,
            loopAnimation: this.state.loopAnimation,
            timeMax: this.state.timeMax,
            timeMin: this.state.timeMin,
            timeStep: this.state.timeStep,
            timeVal: this.state.timeVal,
            onFrameRateUpdate: this.handleFrameRateUpdate.bind(this),
            onLoopToggle: this.handleLoopToggle.bind(this),
            onPlayToggle: this.handlePlayToggle.bind(this),
            onSliderChange: this.handleSliderChange.bind(this),
            onStopClick: this.handleStopClick.bind(this),
        }
        return (
            <Grid container
                  item
                  xs
                  component={Paper}
                  direction='column'
                  spacing={3}
                  style={{ padding: 40 }}
                  id='container-container'>
                <Grid item id={this.containerId} xs />
                <Grid item xs>
                    <PlayerSlider {...playerSliderProps} />
                </Grid>
            </Grid>
        )
    }
}
