import React from "react";
import * as _ from "underscore";

import AppBar from "@material-ui/core/AppBar";
import Grid from "@material-ui/core/Grid";
import Tab from "@material-ui/core/Tab";
import Tabs from "@material-ui/core/Tabs";
import TabContext from "@material-ui/lab/TabContext";
import TabList from "@material-ui/lab/TabList";


// eslint-disable-next-line import/no-unresolved
import { AVConstants } from "../../constants";

// eslint-disable-next-line import/no-unresolved
import { PenetrationData, AVSettings } from "../../models/apiModels";

// eslint-disable-next-line import/no-unresolved
import { AestheticMapping } from "../../viewmodels/aestheticMapping";
// eslint-disable-next-line import/no-unresolved
import { ICompartmentNodeView } from "../../viewmodels/compartmentViewModel";

// eslint-disable-next-line import/no-unresolved
import { PlayerSlider, PlayerSliderProps } from "./PlayerSlider";
// eslint-disable-next-line import/no-unresolved
import { Viewer3D, Viewer3DProps } from "./Viewer3D";
// eslint-disable-next-line import/no-unresolved
import { Viewer2D, Viewer2DProps, Viewer2DType } from "./Viewer2D";


type ViewerType = "3D" | "slice" | "penetration";

export interface ViewerContainerProps {
    aesthetics: AestheticMapping[];
    availablePenetrations: PenetrationData[];
    compartmentViewTree: ICompartmentNodeView;
    constants: AVConstants;
    settings: AVSettings;
    timeMax: number;
    timeMin: number;
    timeStep: number;
}

interface ViewerContainerState {
    frameRate: number;
    isPlaying: boolean;
    isRecording: boolean;
    loopAnimation: "once" | "repeat";
    timeVal: number;
    viewerType: ViewerType;
}

interface CanvasElement extends HTMLCanvasElement {
    captureStream(frameRate?: number): MediaStream;
}

export class ViewerContainer extends React.Component<ViewerContainerProps, ViewerContainerState> {
    private canvasContainerId = "viewer-container";
    private mediaRecorder: MediaRecorder = null;
    private recordedBlobs: Blob[];
    private viewerOptions = ["3D", "slice", "penetration"];

    constructor(props: ViewerContainerProps) {
        super(props);

        this.state = {
            frameRate: 30,
            isPlaying: false,
            isRecording: false,
            loopAnimation: "once",
            timeVal: 0,
            viewerType: "3D",
        };

        this.recordedBlobs = [];
    }

    private animate() {
        if (this.state.isPlaying) {
            const newVal = this.state.timeVal + this.props.timeStep > this.props.timeMax ?
                            this.props.timeMin : this.state.timeVal + this.props.timeStep;

            let callback = (): void => null;
            let newState = { timeVal: newVal };

            if (newVal > this.props.timeMin || this.state.loopAnimation === "repeat") {
                callback = (): void => { setTimeout(this.animate.bind(this), 1000/this.state.frameRate); };
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
        const a = document.createElement("a");
        document.body.appendChild(a);
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
        const newLoop = this.state.loopAnimation === "once" ? "repeat" : "once";
        this.setState({ loopAnimation: newLoop });
    }

    private handlePlayToggle() {
        this.setState({ isPlaying: !this.state.isPlaying }, () => {
            this.animate()
        });
    }

    private handleRecordToggle() {
        // start playing when hitting record
        const isPlaying = this.state.isRecording ?
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

    private handleStopClick(): void {
        this.setState({
            timeVal: this.props.timeMin,
            isPlaying: false,
            isRecording: false
        }, () => {
            this.onRecordingStop();
        });
    }

    private handleViewerTabSelect(_event: never, value: number) {
        const viewerType = this.viewerOptions[value] as ViewerType;

        if (viewerType !== this.state.viewerType) {
            this.setState({ viewerType });
        }
    }

    private onRecordingStart() {
        const canvas: CanvasElement = document.getElementById(this.canvasContainerId)
            .querySelector("canvas") as CanvasElement;

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

    public componentDidUpdate(prevProps: Readonly<ViewerContainerProps>) {
        if (prevProps.timeMin !== this.props.timeMin || prevProps.timeMax !== this.props.timeMax) {
            this.setState({ timeVal: this.props.timeMin });
        }
    }

    public render() {
        const playerSliderProps: PlayerSliderProps = {
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
        };

        function a11yProps(index: string): {id?: string; "aria-controls"?: string} {
            return {
                id: `simple-tab-${index}`,
                'aria-controls': `simple-tabpanel-${index}`,
            };
        }

        const tabValue = this.viewerOptions.indexOf(this.state.viewerType);

        let viewer: any = null;
        if (tabValue === 0) {
            const viewer3DProps: Viewer3DProps = {
                aesthetics: this.props.aesthetics,
                availablePenetrations: this.props.availablePenetrations,
                canvasContainerId: this.canvasContainerId,
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

            viewer = <Viewer3D {...viewer3DProps} />;
        } else if (tabValue === 1) {
            const viewer2DProps: Viewer2DProps = {
                canvasContainerId: this.canvasContainerId,
                constants: this.props.constants,
                settings: this.props.settings,
                viewerType: this.state.viewerType as Viewer2DType,
            };

            viewer = <Viewer2D {...viewer2DProps} />;
        }

        return (
            <Grid container direction="column">
                <Grid item xs>
                    <AppBar position="static">
                    <Tabs value={tabValue}
                          onChange={this.handleViewerTabSelect.bind(this)} aria-label="simple tabs example">
                        <Tab label="3D View" {...a11yProps("3D")} />
                        <Tab label="Slice View" {...a11yProps("slice")} />
                        <Tab label="Penetration View" {...a11yProps("penetration")} />
                    </Tabs>
                </AppBar>
                    {viewer}
                </Grid>
                <Grid item>
                    <PlayerSlider {...playerSliderProps} />
                </Grid>
            </Grid>
        );
    }
}