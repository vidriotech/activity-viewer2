import React from 'react';
import * as _ from 'underscore';

import Container from '@material-ui/core/Container';
import Grid from '@material-ui/core/Grid';

import { AVConstants } from '../../constants';

import { PenetrationData, SettingsData } from '../../models/apiModels';

import { IAesthetics } from '../../viewmodels/aestheticMapping';
import { ICompartmentNodeView } from '../../viewmodels/compartmentViewModel';

import { PlayerSlider, IPlayerSliderProps } from './PlayerSlider';
import { Viewer3D, IViewer3DProps } from './Viewer3D';


export interface IViewerContainerProps {
    aesthetics: IAesthetics[],
    availablePenetrations: PenetrationData[],
    compartmentViewTree: ICompartmentNodeView,
    constants: AVConstants,
    settings: SettingsData,
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

interface CanvasElement extends HTMLCanvasElement {
    captureStream(frameRate?: number): MediaStream;
}
  

export class ViewerContainer extends React.Component<IViewerContainerProps, IViewerContainerState> {
    private canvasContainerId = 'viewer-container';
    private mediaRecorder: MediaRecorder = null;
    private recordedBlobs: Blob[];

    constructor(props: IViewerContainerProps) {
        super(props);

        this.state = {
            frameRate: 30,
            isPlaying: false,
            isRecording: false,
            loopAnimation: 'once',
            timeVal: 0,
        };

        this.recordedBlobs = [];
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

    private downloadRecording() {
        const blob = new Blob(this.recordedBlobs, {
            type: "video/webm"
        });

        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const day = now.getDate();
        const hour = now.getHours();
        const minute = now.getMinutes();
        const second = now.getSeconds();
        const recordingFilename = `recording-${year}${month}${day}-${hour}${minute}${second}.webm`;

        const url = URL.createObjectURL(blob);
        let a = document.createElement('a');
        document.body.appendChild(a);
        // a.style = "display: none";
        a.href = url;
        a.download = recordingFilename;
        a.click();

        window.URL.revokeObjectURL(url);
    }

    private handleStreamDataAvailable(evt: BlobEvent) {
        if (evt.data.size > 0) {
            this.recordedBlobs.push(evt.data);

            if (!this.state.isRecording) {
                this.downloadRecording();
                this.mediaRecorder = null;
                this.recordedBlobs = [];
            }
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
            if (this.state.isRecording) {
                this.onRecordingStart();
            } else {
                this.onRecordingStop();
            }
            this.animate();
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
        }, () => {
            this.onRecordingStop();
        });
    }

    private onRecordingStart() {
        const canvas: CanvasElement = document.getElementById(this.canvasContainerId)
            .querySelector('canvas') as CanvasElement;

        const stream = canvas.captureStream(2*this.state.frameRate);
        this.mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm; codecs=vp9" });
        this.mediaRecorder.ondataavailable = this.handleStreamDataAvailable.bind(this);
        this.mediaRecorder.start();
    }

    private onRecordingStop() {
        if (this.mediaRecorder !== null) {
            this.mediaRecorder.stop();
        }
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
            canvasId: this.canvasContainerId,
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