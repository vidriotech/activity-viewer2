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
import {PenetrationData, AVSettings, SliceData} from "../../models/apiModels";

// eslint-disable-next-line import/no-unresolved
import { AestheticMapping } from "../../models/aestheticMapping";
// eslint-disable-next-line import/no-unresolved
import { CompartmentNodeView } from "../../viewmodels/compartmentViewModel";

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
import {SliceControl} from "./SliceControl";
// eslint-disable-next-line import/no-unresolved
import {Predicate, PropEqPredicate, PropIneqPredicate} from "../../models/predicateModels";
// eslint-disable-next-line import/no-unresolved
import {SliceType} from "../../models/apiModels";
// eslint-disable-next-line import/no-unresolved
import {ImageType, SliceViewer} from "../../viewers/sliceViewer";
import {AxiosResponse} from "axios";
import FormControl from "@material-ui/core/FormControl";
import FormLabel from "@material-ui/core/FormLabel";
import RadioGroup from "@material-ui/core/RadioGroup";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Radio from "@material-ui/core/Radio";
import {Image} from "plotly.js";


type ViewerType = "3D" | "slice" | "penetration";

export interface ViewerContainerProps {
    aesthetics: AestheticMapping[];
    availablePenetrations: PenetrationData[];
    compartmentViewTree: CompartmentNodeView;
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
    imageType: ImageType;
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
    private sliceBounds: number[];
    private sliceType: SliceType;
    private viewer: BaseViewer = null;

    constructor(props: ViewerContainerProps) {
        super(props);

        this.state = {
            dialogOpen: false,
            frameRate: 30,
            imageType: "annotation",
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
        let v: BaseViewer;

        if (this.state.viewerType === "3D") {
            v = new BrainViewer(this.props.constants, this.props.settings.epochs);
            this.initViewer(v);
        } else if (this.state.viewerType === "slice") {
            return this.apiClient.fetchSliceData(this.sliceType, this.sliceBounds[1])
                .then((res) => res.data)
                .then((sliceData) => {
                    v = new SliceViewer(this.props.constants, this.props.settings.epochs, sliceData);
                    (v as SliceViewer).imageType = this.state.imageType;
                    this.initViewer(v);
                });
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

    private handleSliceCommit(sliceType: SliceType, sliceBounds: number[]): void {
        let boundsPredicate: PropIneqPredicate;
        switch (sliceType) {
            case "coronal":
                boundsPredicate = new PropIneqPredicate("x", sliceBounds[0], sliceBounds[2]);
                break;
            case "sagittal":
                boundsPredicate = new PropIneqPredicate("z", sliceBounds[0], sliceBounds[2]);
                break;
        }

        this.sliceType = sliceType;
        this.sliceBounds = sliceBounds;

        this.setState({dialogOpen: false, viewerType: "slice"}, () => {
            this.props.onFilterPredicateUpdate(boundsPredicate);
        });
    }

    private handleSliderChange(_event: any, timeVal: number): void {
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

    private handleStreamDataAvailable(evt: BlobEvent): void {
        if (evt.data.size > 0) {
            this.recordedBlobs.push(evt.data);

            if (!this.state.isRecording) {
                this.downloadRecording();
                this.mediaRecorder = null;
                this.recordedBlobs = [];
            }
        }
    }

    private handleViewerChange(): void {
        if (this.state.viewerType === "3D") {
            this.setState({dialogOpen: true});
        } else {
            this.setState({viewerType: "3D"});
        }
    }

    private initViewer(v: BaseViewer): void {
        const { width, height } = this.computeDims();

        v.container = this.canvasContainerId; // div is created in render()
        v.WIDTH = width;
        v.HEIGHT = height;

        v.initialize();
        v.animate();
        v.setTime(this.props.timeMin, this.props.timeMax, this.props.timeStep, this.state.timeVal);

        this.viewer = v;
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

    private reinitViewer(): void {
        this.viewer.destroy();
        this.viewer = null;
        this.createAndRender();
    }

    private renderCompartments() {
        if (this.viewer === null || !(this.viewer instanceof BrainViewer)) {
            return;
        }

        const viewer = this.viewer as BrainViewer;

        // traverse the compartment tree and set visible or invisible
        let queue: CompartmentNodeView[] = [this.props.compartmentViewTree];
        while (queue.length > 0) {
            const compartmentNodeView: CompartmentNodeView = queue.splice(0, 1)[0];
            viewer.setCompartmentVisible(compartmentNodeView);
            queue = queue.concat(compartmentNodeView.children);
        }
    }

    private renderPenetrations() {
        if (this.viewer === null) {
            return;
        }

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
        if (prevState.viewerType !== this.state.viewerType) {
            this.reinitViewer();
        } else if (prevState.imageType !== this.state.imageType) {
            (this.viewer as SliceViewer).imageType = this.state.imageType;
        } else if (prevProps.aesthetics !== this.props.aesthetics || prevProps.availablePenetrations !== this.props.availablePenetrations) {
            this.renderPenetrations();
        }

        if (prevProps.timeMin !== this.props.timeMin || prevProps.timeMax !== this.props.timeMax) {
            this.setState({ timeVal: this.props.timeMin }, () => {
                this.viewer.setTime(this.props.timeMin, this.props.timeMax, this.props.timeStep, this.state.timeVal);
            });
        } else if (prevState.timeVal !== this.state.timeVal && this.viewer !== null) {
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

        const dialog = (
            <Dialog fullWidth
                    open={this.state.dialogOpen}
                    onClose={(): void => this.setState({dialogOpen: false})}>
                <DialogTitle id={"form-dialog-title"}>Slice and dice</DialogTitle>
                <DialogContent>
                    <SliceControl constants={this.props.constants}
                                  onCommit={this.handleSliceCommit.bind(this)} />
                </DialogContent>
            </Dialog>
        );

        const buttonText = this.state.viewerType === "3D" ?
            "Slice and dice" :
            "Return to 3D";

        const imageTypeSwitch = (
            <FormControl component="fieldset">
                <FormLabel component="legend">Image type</FormLabel>
                <RadioGroup row
                            aria-label="image type"
                            name="imgType"
                            value={this.state.imageType}
                            onChange={(evt) => {
                                this.setState({imageType: evt.target.value as ImageType})
                            }}>
                    <FormControlLabel value="annotation" control={<Radio />} label="A" />
                    <FormControlLabel value="template" control={<Radio />} label="T" />
                </RadioGroup>
            </FormControl>
        );

        const switchButton = (
            <div>
                <Button color={"primary"}
                        variant={"contained"}
                        onClick={this.handleViewerChange.bind(this)}>
                    {buttonText}
                </Button>
                {this.state.viewerType === "slice" ? imageTypeSwitch : null}
            </div>
        );

        return (
            <Grid container>
                <Grid item xs={12}>
                    <div style={{ padding: 40 }}
                         id={this.canvasContainerId} />
                </Grid>
                <Grid item xs={4}>
                    {switchButton}
                </Grid>
                <Grid item xs={8}>
                    <PlayerSlider {...playerSliderProps} />
                </Grid>
                <Grid item xs>
                    {dialog}
                </Grid>
            </Grid>
        );
    }
}