import React from "react";
import * as _ from "underscore";

import AppBar from "@material-ui/core/AppBar";
import Button from '@material-ui/core/Button';
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
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
import {APIClient} from "../../apiClient";
// eslint-disable-next-line import/no-unresolved
import {BaseViewer} from "../../viewers/baseViewer";
// eslint-disable-next-line import/no-unresolved
import {BrainViewer} from "../../viewers/brainViewer";
// eslint-disable-next-line import/no-unresolved
import {PenetrationViewModel} from "../../viewmodels/penetrationViewModel";
// eslint-disable-next-line import/no-unresolved
import {SliceControl, SliceType} from "./SliceControl";
// eslint-disable-next-line import/no-unresolved
import {Predicate, PropEqPredicate, PropIneqPredicate} from "../../models/predicateModels";


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
    onFilterPredicateUpdate(predicate: Predicate, newStat?: string): void;
}

interface ViewerContainerState {
    dialogOpen: boolean;
    frameRate: number;
    isPlaying: boolean;
    isRecording: boolean;
    loopAnimation: "once" | "repeat";
    renderHeight: number;
    renderWidth: number;
    timeVal: number;
    viewerType: ViewerType;
}

interface CanvasElement extends HTMLCanvasElement {
    captureStream(frameRate?: number): MediaStream;
}

export class ViewerContainer extends React.Component<ViewerContainerProps, ViewerContainerState> {
    private apiClient: APIClient;
    private canvasContainerId = "viewer-container";
    private mediaRecorder: MediaRecorder = null;
    private recordedBlobs: Blob[];
    private viewerOptions = ["3D", "slice", "penetration"];
    private viewer: BaseViewer = null;

    constructor(props: ViewerContainerProps) {
        super(props);

        this.state = {
            dialogOpen: false,
            frameRate: 30,
            isPlaying: false,
            isRecording: false,
            loopAnimation: "once",
            renderHeight: 0,
            renderWidth: 0,
            timeVal: 0,
            viewerType: "3D",
        };

        this.apiClient = new APIClient(this.props.constants.apiEndpoint);
        this.recordedBlobs = [];
    }

    private animate(): void {
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

    private computeDims(): { width: number; height: number } {
        const container = document.getElementById(this.canvasContainerId);
        if (!container) {
            return { width: 0, height: 0 };
        }

        const width = container.clientWidth;
        const height = width / 1.85; // 1.85:1 aspect ratio

        return { width, height };
    }

    private createAndRender(): void {
        this.createViewer()
            .then(() => {
                this.renderCompartments();
                this.renderPenetrations();
            })
    }

    private async createViewer(): Promise<any> {
        const { width, height } = this.computeDims();
        const v = new BrainViewer(this.props.constants, this.props.settings.epochs);

        v.container = this.canvasContainerId; // div is created in render()
        v.WIDTH = width;
        v.HEIGHT = height;

        v.initialize();
        v.animate();
        v.setTime(this.props.timeMin, this.props.timeMax, this.props.timeStep, this.state.timeVal);

        this.viewer = v;
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

    private handleSliceCommit(sliceType: SliceType, bounds: number[]): void {
        let lowerBound: PropEqPredicate, upperBound: PropEqPredicate;
        let boundsPredicate: PropIneqPredicate;
        switch (sliceType) {
            case "Coronal":
                boundsPredicate = new PropIneqPredicate("x", bounds[0], bounds[2]);
                break;
            case "Sagittal":
                boundsPredicate = new PropIneqPredicate("z", bounds[0], bounds[2]);
                break;
            case "Horizontal":
                boundsPredicate = new PropIneqPredicate("y", bounds[0], bounds[2]);
                break;
        }

        console.log(boundsPredicate);
        console.log(sliceType);
        console.log(bounds);
        this.setState({dialogOpen: false}, () => {
            this.props.onFilterPredicateUpdate(boundsPredicate)
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

    private renderCompartments() {
        if (this.viewer === null || !(this.viewer instanceof BrainViewer)) {
            return;
        }

        const viewer = this.viewer as BrainViewer;

        // traverse the compartment tree and set visible or invisible
        let queue: ICompartmentNodeView[] = [this.props.compartmentViewTree];
        while (queue.length > 0) {
            const compartmentNodeView: ICompartmentNodeView = queue.splice(0, 1)[0];
            viewer.setCompartmentVisible(compartmentNodeView);
            queue = queue.concat(compartmentNodeView.children);
        }
    }

    private renderPenetrations() {
        this.props.availablePenetrations.forEach((penetration) => {
            if (penetration.ids.length == 0) {
                return;
            }

            if (!this.viewer.hasPenetration(penetration.penetrationId)) {
                this.viewer.loadPenetration(penetration);
            }

            // find aesthetics for this penetration
            let aesthetics: AestheticMapping = null;
            this.props.aesthetics.forEach((mapping) => {
                if (mapping.penetrationId == penetration.penetrationId) {
                    aesthetics = mapping;
                }
            });

            if (aesthetics === null) {
                return;
            }

            // create a view model for this penetration
            const viewModel = new PenetrationViewModel(aesthetics, penetration.ids.length);
            this.viewer.setAesthetics(penetration.penetrationId, viewModel);
        });

        this.viewer.updatePenetrationAesthetics();
    }

    private updateDims(): void {
        const { width, height } = this.computeDims();
        this.setState({ renderWidth: width, renderHeight: height });

        if (this.viewer !== null) {
            this.viewer.setSize(width, height);
        }
    }

    public componentDidMount(): void {
        window.addEventListener("resize", () => this.updateDims());

        this.createAndRender();
    }

    public componentDidUpdate(
        prevProps: Readonly<ViewerContainerProps>,
        prevState: Readonly<ViewerContainerState>
    ): void {
        if (prevProps.aesthetics !== this.props.aesthetics || prevProps.availablePenetrations !== this.props.availablePenetrations) {
            this.renderPenetrations();
        }

        if (prevProps.timeMin !== this.props.timeMin || prevProps.timeMax !== this.props.timeMax) {
            this.setState({ timeVal: this.props.timeMin }, () => {
                this.viewer.setTime(this.props.timeMin, this.props.timeMax, this.props.timeStep, this.state.timeVal);
            });
        } else if (prevState.timeVal !== this.state.timeVal) {
            this.viewer.timeVal = this.state.timeVal;
        }
    }

    public render(): React.ReactNode {
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

        // function a11yProps(index: string): {id?: string; "aria-controls"?: string} {
        //     return {
        //         id: `simple-tab-${index}`,
        //         'aria-controls': `simple-tabpanel-${index}`,
        //     };
        // }

        // const tabValue = this.viewerOptions.indexOf(this.state.viewerType);

        // let viewer: any = null;
        // if (tabValue === 0) {
        //     const viewer3DProps: Viewer3DProps = {
        //         aesthetics: this.props.aesthetics,
        //         availablePenetrations: this.props.availablePenetrations,
        //         canvasContainerId: "viewer-container-3d",
        //         constants: this.props.constants,
        //         frameRate: this.state.frameRate,
        //         isPlaying: this.state.isPlaying,
        //         loopAnimation: this.state.loopAnimation,
        //         settings: this.props.settings,
        //         timeMin: this.props.timeMin,
        //         timeMax: this.props.timeMax,
        //         timeStep: this.props.timeStep,
        //         timeVal: this.state.timeVal,
        //         compartmentViewTree: this.props.compartmentViewTree,
        //     };
        //
        //     viewer = <Viewer3D {...viewer3DProps} />;
        // } else if (tabValue === 1) {
        //     const viewer2DProps: Viewer2DProps = {
        //         aesthetics: this.props.aesthetics,
        //         availablePenetrations: this.props.availablePenetrations,
        //         canvasContainerId: "viewer-container-slice",
        //         constants: this.props.constants,
        //         settings: this.props.settings,
        //         viewerType: this.state.viewerType as Viewer2DType,
        //     };
        //
        //     viewer = <Viewer2D {...viewer2DProps} />;
        // }

        return (
            <Grid container>
                <Grid item xs={12}>
                    {/*<AppBar position="static">*/}
                    {/*    <Tabs value={tabValue}*/}
                    {/*          onChange={this.handleViewerTabSelect.bind(this)} aria-label="simple tabs example">*/}
                    {/*        <Tab label="3D View" {...a11yProps("3D")} />*/}
                    {/*        <Tab label="Slice View" {...a11yProps("slice")} />*/}
                    {/*        <Tab label="Penetration View" {...a11yProps("penetration")} />*/}
                    {/*    </Tabs>*/}
                    {/*    <Typography>This is some text.</Typography>*/}
                    {/*</AppBar>*/}
                    <div style={{ padding: 40 }}
                         id={this.canvasContainerId} />
                </Grid>
                <Grid item xs={4}>
                    <Button color={"primary"}
                            variant={"contained"}
                            onClick={(): void => this.setState({dialogOpen: true})}>
                        Slice and dice
                    </Button>
                </Grid>
                <Grid item xs={8}>
                    <PlayerSlider {...playerSliderProps} />
                </Grid>
                <Grid item xs>
                    <Dialog fullWidth
                            open={this.state.dialogOpen}
                            onClose={(): void => this.setState({dialogOpen: false})}>
                        <DialogTitle id={"form-dialog-title"}>Slice and dice</DialogTitle>
                        <DialogContent>
                            <SliceControl constants={this.props.constants}
                                          onCommit={this.handleSliceCommit.bind(this)} />
                        </DialogContent>
                    </Dialog>
                </Grid>
            </Grid>
        );
    }
}