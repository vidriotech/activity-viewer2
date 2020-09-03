import React from 'react';
import * as _ from 'underscore';

import Container from '@material-ui/core/Container';
import Grid from '@material-ui/core/Grid';

import { AVConstants } from '../../constants';

import { IPenetrationData, ISettingsResponse } from '../../models/apiModels';

import { IAesthetics } from '../../viewmodels/aestheticMapping';
import { ICompartmentNodeView } from '../../viewmodels/compartmentViewModel';

import { PlayerSlider, IPlayerSliderProps } from './PlayerSlider';
import { Viewer3D, IViewer3DProps } from './Viewer3D';


export interface IViewerContainerProps {
    aesthetics: IAesthetics[],
    availablePenetrations: IPenetrationData[],
    compartmentViewTree: ICompartmentNodeView,
    constants: AVConstants,
    settings: ISettingsResponse,
    timeMax: number,
    timeMin: number,
    timeStep: number,
    viewerType: '3D' | 'Pseudocoronal' | 'Penetration',
}

interface IViewerContainerState {
    frameRate: number,
    isPlaying: boolean,
    isRecording: boolean,
    loopAnimation: 'once' | 'repeat',
    timeVal: number,
}

export class ViewerContainer extends React.Component<IViewerContainerProps, IViewerContainerState> {
    private canvasId = 'viewer-container';

    constructor(props: IViewerContainerProps) {
        super(props);

        this.state = {
            frameRate: 30,
            isPlaying: false,
            isRecording: false,
            loopAnimation: 'once',
            timeVal: 0,
        }
    }

    private animate() {
        if (this.state.isPlaying) {
            const newVal = this.state.timeVal + this.props.timeStep > this.props.timeMax ?
                            this.props.timeMin : this.state.timeVal + this.props.timeStep;
            
            let callback = () => {};
            let newState = { timeVal: newVal };

            if (newVal > this.props.timeMin || this.state.loopAnimation === 'repeat') {
                callback = () => { setTimeout(this.animate.bind(this), 1000/this.state.frameRate); };
            } else {
                newState = _.extend(newState, { isPlaying: false });
            }

            this.setState(newState, callback);
        }
    }

    private handleFrameRateUpdate(frameRate: number) {
        this.setState({ frameRate: frameRate });
    }

    private handleLoopToggle() {
        const newLoop = this.state.loopAnimation === 'once' ? 'repeat' : 'once';
        this.setState({ loopAnimation: newLoop });
    }

    private handlePlayToggle() {
        this.setState({ isPlaying: !this.state.isPlaying }, () => {
            this.animate()
        });
    }

    private handleRecordToggle() {
        // start playing when hitting record
        let isPlaying = this.state.isRecording ?
            this.state.isPlaying :
            true;

        this.setState({
            isRecording: !this.state.isRecording,
            isPlaying: isPlaying
        }, () => {
            this.animate();
            if (!this.state.isRecording) {
                this.onRecordingStop();
            }
        });
    }

    private handleSliderChange(_event: any, timeVal: number) {
        this.setState({ timeVal });
    }

    private handleStopClick() {
        this.setState({
            timeVal: this.props.timeMin,
            isPlaying: false,
            isRecording: false
        });
    }

    private onRecordingStop() {
        
    }

    public componentDidUpdate(prevProps: Readonly<IViewerContainerProps>) {
        if (prevProps.timeMin !== this.props.timeMin || prevProps.timeMax !== this.props.timeMax) {
            this.setState({ timeVal: this.props.timeMin });
        }
    }

    public render() {
        const viewer3DProps: IViewer3DProps = {
            aesthetics: this.props.aesthetics,
            availablePenetrations: this.props.availablePenetrations,
            canvasId: this.canvasId,
            constants: this.props.constants,
            frameRate: this.state.frameRate,
            isPlaying: this.state.isPlaying,
            loopAnimation: this.state.loopAnimation,
            settings: this.props.settings,
            timeMin: this.props.timeMin,
            timeMax: this.props.timeMax,
            timeStep: this.props.timeStep,
            timeVal: this.state.timeVal,
            compartmentViewTree: this.props.compartmentViewTree,
        };

        const playerSliderProps: IPlayerSliderProps = {
            frameRate: this.state.frameRate,
            isPlaying: this.state.isPlaying,
            isRecording: this.state.isRecording,
            loopAnimation: this.state.loopAnimation,
            timeMax: this.props.timeMax,
            timeMin: this.props.timeMin,
            timeStep: this.props.timeStep,
            timeVal: this.state.timeVal,
            onFrameRateUpdate: this.handleFrameRateUpdate.bind(this),
            onLoopToggle: this.handleLoopToggle.bind(this),
            onPlayToggle: this.handlePlayToggle.bind(this),
            onRecordToggle: this.handleRecordToggle.bind(this),
            onSliderChange: this.handleSliderChange.bind(this),
            onStopClick: this.handleStopClick.bind(this),
        }

        return (
            <Grid container direction='column'>
                <Grid item xs>
                    <Viewer3D {...viewer3DProps} />
                </Grid>
                <Grid item>
                    <PlayerSlider {...playerSliderProps} />
                </Grid>
            </Grid>
        );
    }
}