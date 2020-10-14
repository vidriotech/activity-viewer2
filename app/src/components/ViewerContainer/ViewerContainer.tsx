import React from "react";
import * as _ from "lodash";

import Button from "@material-ui/core/Button";
import CircularProgress from "@material-ui/core/CircularProgress";
import Drawer from "@material-ui/core/Drawer";
import Grid from "@material-ui/core/Grid";
import IconButton from "@material-ui/core/IconButton";
import Typography from "@material-ui/core/Typography";

import {ChevronLeft, ChevronRight, LockOpenOutlined, LockOutlined} from "@material-ui/icons";

// eslint-disable-next-line import/no-unresolved
import {APIClient} from "../../apiClient";
// eslint-disable-next-line import/no-unresolved
import {AVConstants, colorMaps} from "../../constants";
// eslint-disable-next-line import/no-unresolved
import {tab10Blue} from "../../styles";

import {
    AestheticMapping,
    AestheticProps,
// eslint-disable-next-line import/no-unresolved
} from "../../models/aestheticMapping";
// eslint-disable-next-line import/no-unresolved
import {AVSettings} from "../../models/apiModels";
// eslint-disable-next-line import/no-unresolved
import {CompartmentTree} from "../../models/compartmentTree";
// eslint-disable-next-line import/no-unresolved
import {SliceImageType, SliceType} from "../../models/enums";
// eslint-disable-next-line import/no-unresolved
import {Penetration} from "../../models/penetration";
// eslint-disable-next-line import/no-unresolved
import {Predicate} from "../../models/predicates";
// eslint-disable-next-line import/no-unresolved
import {TimeseriesSummary} from "../../models/timeseries";
// eslint-disable-next-line import/no-unresolved
import {TomographySlice} from "../../models/tomographySlice";

// eslint-disable-next-line import/no-unresolved
import {BrainViewer} from "../../viewers/brainViewer";

// eslint-disable-next-line import/no-unresolved
import {PlayerSlider, PlayerSliderProps} from "./PlayerSlider";
// eslint-disable-next-line import/no-unresolved
import {TimeseriesMappers, TimeseriesMappersProps} from "../TimeseriesControls/TimeseriesMappers";

export interface ViewerContainerProps {
    compartmentTree: CompartmentTree;
    constants: AVConstants;
    settings: AVSettings;

    availableTimeseries: Set<string>;
    selectedPenetrations: Map<string, Penetration>;
    visibleCompartmentIds: Set<number>;

    busy: boolean;
    progress: number;
    progressMessage: string;

    showDataPanel: boolean;
    showPhysPanel: boolean;

    showTomographyAnnotation: boolean;
    showTomographySlice: boolean;
    tomographySliceType: SliceType;
    tomographySliceCoordinate: number;

    showTestSlice: boolean;
    testSliceType: SliceType;
    testSliceBounds: [number, number];

    onExpand(side: "l" | "r"): void;
    onUpdateFilterPredicate(predicate: Predicate, newStat?: string): void;
    onUpdateProgress(progress: number, progressMessage: string): void;
}

interface ViewerContainerState extends AestheticProps {
    dialogOpen: boolean;
    frameRate: number;
    imageType: SliceImageType;
    renderHeight: number;
    renderWidth: number;

    colorTimeseries: string;
    colorBounds: [number, number];
    colorGamma: number;
    colorMapping: string;

    opacityTimeseries: string;
    opacityBounds: [number, number];
    opacityGamma: number;

    radiusTimeseries: string;
    radiusBounds: [number, number];
    radiusGamma: number;

    isPlaying: boolean;
    isRecording: boolean;
    loopAnimation: "once" | "repeat";
    timeMin: number;
    timeMax: number;
    timeStep: number;
    timeVal: number;

    rotateLocked: boolean;
    showMappers: boolean;
}

interface CanvasElement extends HTMLCanvasElement {
    captureStream(frameRate?: number): MediaStream;
}

export class ViewerContainer extends React.Component<ViewerContainerProps, ViewerContainerState> {
    private apiClient: APIClient;
    private canvasContainerId = "viewer-container";
    private mediaRecorder: MediaRecorder = null;
    private recordedBlobs: Blob[];
    private viewer: BrainViewer = null;

    private tsSummaries: Map<string, TimeseriesSummary>;
    private progress = 1;

    constructor(props: ViewerContainerProps) {
        super(props);

        // min time, max time, time step
        let timeMin = NaN;
        let timeMax = NaN;
        let timeStep = NaN;
        if (this.props.settings.epochs.length > 0) {
            const epochs = this.props.settings.epochs.sort((e1, e2) => e1.bounds[0] - e2.bounds[0])
            timeMin = epochs[0].bounds[0];
            timeMax = epochs[epochs.length - 1].bounds[1];
            timeStep = (timeMax - timeMin) / 100
        }

        this.state = {
            dialogOpen: false,
            frameRate: 30,
            imageType: SliceImageType.ANNOTATION,
            renderHeight: 0,
            renderWidth: 0,

            colorTimeseries: "nothing",
            colorBounds: [0, 1],
            colorGamma: 1,
            colorMapping: "bwr",
            opacityTimeseries: "nothing",
            opacityBounds: [0.01, 1],
            opacityGamma: 1,
            radiusTimeseries: "nothing",
            radiusBounds: [0.01, 1],
            radiusGamma: 1,

            isPlaying: false,
            isRecording: false,
            loopAnimation: "once",
            timeMin: timeMin,
            timeMax: timeMax,
            timeStep: timeStep,
            timeVal: isNaN(timeMin) ? 0 : timeMin,

            rotateLocked: false,
            showMappers: false,
        };

        this.apiClient = new APIClient(this.props.constants.apiEndpoint);
        this.recordedBlobs = [];

        this.tsSummaries = new Map<string, TimeseriesSummary>();
    }

    private animate(): void {
        if (this.state.isPlaying) {
            const newVal = this.state.timeVal + this.state.timeStep > this.state.timeMax ?
                            this.state.timeMin : this.state.timeVal + this.state.timeStep;

            let callback = (): void => {
                this.viewer.timeVal = this.state.timeVal;
            };
            let newState = { timeVal: newVal };

            if (newVal > this.state.timeMin || this.state.loopAnimation === "repeat") {
                callback = (): void => {
                    this.viewer.timeVal = this.state.timeVal;
                    setTimeout(this.animate.bind(this), 1000/this.state.frameRate);
                };
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
        const height = 600;

        return { width, height };
    }

    private async createViewer(): Promise<void> {
        const v = new BrainViewer(this.props.settings.epochs);
        this.initViewer(v);
    }

    private lockToPlane(): void {
        this.setState({rotateLocked: true}, () => {
            if (this.viewer) {
                this.viewer.lockToPlane();
                this.viewer.hideAllCompartments();
                this.viewer.projectToPlane();
            }
        });
    }

    private unlockFromPlane(): void {
        this.setState({rotateLocked: false}, () => {
            if (this.viewer) {
                this.viewer.unlockFromPlane();
                this.viewer.undoProjectToPlane();
            }
        });
    }

    private setTestSlice(): void {
        if (!this.viewer) {
            return;
        }

        const center = (this.props.testSliceBounds[0] + this.props.testSliceBounds[1]) / 2;
        const offset = Math.abs(this.props.testSliceBounds[0] - center);

        this.viewer.setSlicingPlanes(this.props.testSliceType, {center, offset});
    }

    private removeTestSlice(): void {
        if (!this.viewer) {
            return;
        }

        this.viewer.removeSlicingPlanes();
    }

    private setTomographySlice(): void {
        if (!this.viewer) {
            return;
        }

        const coordinate = this.props.tomographySliceCoordinate;
        const slice = new TomographySlice(this.props.tomographySliceType, coordinate);
        slice.initialize()
            .then(() => {
                slice.imageType = this.props.showTomographyAnnotation ?
                    SliceImageType.ANNOTATION :
                    SliceImageType.TEMPLATE;

                this.viewer.setTomographySlice(slice);
                this.lockToPlane();
            })
            .catch((err) => {
                console.error(err);
            });
    }

    private removeTomographySlice(): void {
        if (!this.viewer) {
            return;
        }

        this.viewer.removeTomographySlice();
    }

    private updateTomographySliceTexture(): void {
        if (!this.viewer) {
            return;
        }

        const displayTemplate = !this.props.showTomographyAnnotation;
        this.viewer.updateSliceTexture(displayTemplate);
    }

    private downloadRecording(): void {
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

    private async fetchTimeseriesSummary(timeseriesId: string): Promise<void> {
        if (timeseriesId === "nothing" || this.tsSummaries.has(timeseriesId)) {
            return;
        }

        return this.apiClient.fetchTimeseriesSummary(timeseriesId)
            .then((res) => res.data)
            .then((summary) => {
                this.tsSummaries.set(timeseriesId, summary);
            });
    }

    private onFetchSuccessful(increment: number): void {
        this.progress += increment;
        const message = this.progress < 1 ?
            `Loading timeseries... ${Math.round(100 * this.progress)}%` :
            "Ready."

        this.props.onUpdateProgress(this.progress, message);
    }

    private propagateAestheticCommit(): void {
        this.fetchTimeseriesSummary(this.state.colorTimeseries)
            .then(() => this.fetchTimeseriesSummary(this.state.opacityTimeseries))
            .then(() => this.fetchTimeseriesSummary(this.state.radiusTimeseries))
            .then(() => {
                const mapping: AestheticMapping = {
                    color: null,
                    opacity: null,
                    radius: null,
                };

                let timeMin = NaN;
                let timeMax = NaN;
                let timeStep = NaN;

                const summaries: TimeseriesSummary[] = [];
                if (this.state.colorTimeseries !== "nothing") {
                    summaries.push(this.tsSummaries.get(this.state.colorTimeseries));
                }
                if (this.state.opacityTimeseries !== "nothing") {
                    summaries.push(this.tsSummaries.get(this.state.opacityTimeseries));
                }
                if (this.state.radiusTimeseries !== "nothing") {
                    summaries.push(this.tsSummaries.get(this.state.radiusTimeseries));
                }

                summaries.forEach((summary) => {
                    if (isNaN(timeMin)) {
                        timeMin = summary.timeMin;
                    }

                    if (isNaN(timeMax)) {
                        timeMax = summary.timeMax;
                    }

                    if (isNaN(timeStep)) {
                        timeStep = summary.timeStep;
                    }

                    timeMin = Math.min(timeMin, summary.timeMin);
                    timeMax = Math.max(timeMax, summary.timeMax);
                    timeStep = Math.min(timeStep, summary.timeStep);
                });

                this.setState({
                    timeMin,
                    timeMax,
                    timeStep: timeStep,
                    timeVal: timeMin,
                }, () => {
                    if (this.viewer) {
                        this.progress = 0;
                        this.props.onUpdateProgress(0, "Loading timeseries...");

                        this.viewer.setTime(this.state.timeMin, this.state.timeMax, this.state.timeStep, this.state.timeVal);
                        this.viewer.clearAestheticAssignments();

                        const increment = 1 / (3 * this.props.selectedPenetrations.size);

                        if (this.state.colorTimeseries !== "nothing") {
                            const summary = this.tsSummaries.get(this.state.colorTimeseries);

                            const colorLUT = colorMaps.get(this.state.colorMapping);
                            mapping.color = {
                                timeseriesId: this.state.colorTimeseries,
                                transformParams: {
                                    domainBounds: [summary.minVal, summary.maxVal],
                                    targetBounds: this.state.colorBounds,
                                    gamma: this.state.colorGamma,
                                },
                                colorLUT: colorLUT ? colorLUT : null
                            };
                        }

                        if (this.state.opacityTimeseries !== "nothing") {
                            const summary = this.tsSummaries.get(this.state.opacityTimeseries)
                            mapping.opacity = {
                                timeseriesId: this.state.opacityTimeseries,
                                transformParams: {
                                    domainBounds: [summary.minVal, summary.maxVal],
                                    targetBounds: this.state.opacityBounds,
                                    gamma: this.state.opacityGamma,
                                }
                            };
                        }

                        if (this.state.radiusTimeseries !== "nothing") {
                            const summary = this.tsSummaries.get(this.state.radiusTimeseries);
                            mapping.radius = {
                                timeseriesId: this.state.radiusTimeseries,
                                transformParams: {
                                    domainBounds: [summary.minVal, summary.maxVal],
                                    targetBounds: this.state.radiusBounds,
                                    gamma: this.state.radiusGamma,
                                }
                            };

                        }

                        this.viewer.setAestheticAssignment(mapping, () => this.onFetchSuccessful(increment));
                    }
                });
            })
            .catch((err) => console.error(err));
    }

    private handleLoopToggle(): void {
        const newLoop = this.state.loopAnimation === "once" ? "repeat" : "once";
        this.setState({ loopAnimation: newLoop });
    }

    private handlePlayToggle(): void {
        this.setState({ isPlaying: !this.state.isPlaying }, () => {
            this.animate()
        });
    }

    private handleRecordToggle(): void {
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

    private handleSliderChange(_event: any, timeVal: number): void {
        this.setState({ timeVal }, () => {
            this.viewer.timeVal = this.state.timeVal;
        });
    }

    private handleStopClick(): void {
        this.setState({
            timeVal: this.state.timeMin,
            isPlaying: false,
            isRecording: false
        }, () => {
            this.viewer.timeVal = this.state.timeVal;
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

    private initViewer(v: BrainViewer): void {
        const { width, height } = this.computeDims();

        v.container = this.canvasContainerId; // div is created in render()
        v.WIDTH = width;
        v.HEIGHT = height;

        v.initialize();
        v.animate();
        v.setTime(this.state.timeMin, this.state.timeMax, this.state.timeStep, this.state.timeVal);

        this.viewer = v;
    }

    private onRecordingStart(): void {
        const canvas: CanvasElement = document.getElementById(this.canvasContainerId)
            .querySelector("canvas") as CanvasElement;

        const stream = canvas.captureStream(2*this.state.frameRate);
        this.mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm; codecs=vp9" });
        this.mediaRecorder.ondataavailable = this.handleStreamDataAvailable.bind(this);
        this.mediaRecorder.start();
    }

    private onRecordingStop(): void {
        if (this.mediaRecorder !== null) {
            this.mediaRecorder.stop();
        }
    }

    private renderCompartments(): void {
        if (!this.viewer || this.state.rotateLocked) {
            return;
        }

        const viewer = this.viewer;

        // traverse the compartment tree and set visible or invisible
        for (const compartmentNode of this.props.compartmentTree.getAllCompartmentNodes()) {
            viewer.setCompartmentVisible(compartmentNode, this.props.visibleCompartmentIds.has(compartmentNode.id));
        }
    }

    private renderHeader(): React.ReactElement {
        const dataPanelHeader = (
            this.props.showDataPanel ?
                null :
                <Grid container item xs={1}
                      justify="flex-start" >
                    <IconButton color="inherit"
                                size="small"
                                onClick={(): void => this.props.onExpand("l")}>
                        <ChevronRight />
                    </IconButton>
                </Grid>
        );

        const physiologyPanelHeader = (
            this.props.showPhysPanel ?
                null :
                <Grid container item xs={1}
                      justify="flex-end">
                    <IconButton color="inherit"
                                size="small"
                                onClick={(): void => this.props.onExpand("r")}>
                        <ChevronLeft />
                    </IconButton>
                </Grid>
        );

        const lockButton = (
            <Grid container item xs={1}
                  justify="flex-end" >
                {
                    this.state.rotateLocked ?
                        <IconButton disabled={this.props.busy}
                                    color="inherit"
                                    size="small"
                                    onClick={() => this.unlockFromPlane()}>
                            <LockOutlined />
                        </IconButton> :
                        <IconButton disabled={this.props.busy || !this.props.showTomographySlice}
                                    color="inherit"
                                    size="small"
                                    onClick={() => this.lockToPlane()}>
                            <LockOpenOutlined />
                        </IconButton>
                }
            </Grid>
        );

        return (
            <Grid container spacing={0}
                  style={{
                      backgroundColor: tab10Blue,
                      "borderLeft": "1px solid black",
                      "borderRight": "1px solid black",
                      "borderBottom": "1px solid black",
                      color: "white",
                      height: "50px",
                      width: "100%",
                      margin: 0,
                      padding: "10px",
                  }}>
                {dataPanelHeader}
                <Grid container item xs
                      justify="flex-start">
                    {this.props.busy ?
                        <Grid item xs={1}>
                            <CircularProgress color="secondary"
                                              variant="indeterminate"
                                              size={20} />

                        </Grid> : null
                    }
                    <Grid item xs
                          style={{alignItems: "center"}}>
                        <Typography align="left" gutterBottom>
                            {this.props.progressMessage}
                        </Typography>
                    </Grid>
                </Grid>
                {lockButton}
                {physiologyPanelHeader}
            </Grid>
        );
    }

    private renderFooter(): React.ReactElement {
        return (
            <Grid container
                  spacing={0}
                  style={{
                      backgroundColor: tab10Blue,
                      "borderLeft": "1px solid black",
                      "borderRight": "1px solid black",
                      "borderTop": "1px solid black",
                      color: "white",
                      height: "50px",
                      width: "100%",
                      margin: 0,
                      padding: "10px",
                  }}>
                <Grid item xs={10} />
                <Grid item xs>
                    <Button color="inherit"
                            disabled={this.props.busy}
                            onClick={() => this.setState({showMappers: !this.state.showMappers})} >
                        {`${this.state.showMappers ? "Hide" : "Show"} mappers`}
                    </Button>
                </Grid>
            </Grid>
        );
    }

    private renderPenetrations(): void {
        if (this.viewer === null) {
            return;
        }

        this.props.selectedPenetrations.forEach((penetration, penetrationId) => {
            if (!this.viewer.hasPenetration(penetrationId)) {
                this.viewer.loadPenetration(penetration);
            }
        });

        this.viewer.updateAllPenetrationAttributes();
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

        this.createViewer()
            .then(() => {
                this.renderCompartments();
                this.renderPenetrations();
            });
    }

    public componentDidUpdate(prevProps: Readonly<ViewerContainerProps>): void {
        if (this.props.showTestSlice && (
            !prevProps.showTestSlice ||
            (prevProps.testSliceType !== this.props.testSliceType) ||
            (prevProps.testSliceBounds !== this.props.testSliceBounds))
        ) {
            this.setTestSlice();
        } else if (!this.props.showTestSlice) {
            this.removeTestSlice();
        }

        if (this.props.showTomographySlice && (
            !prevProps.showTomographySlice ||
            (prevProps.tomographySliceType !== this.props.tomographySliceType) ||
            (prevProps.tomographySliceCoordinate !== this.props.tomographySliceCoordinate))
        ) {
            this.setTomographySlice();
        } else if (!this.props.showTomographySlice) {
            this.removeTomographySlice();
        } else if (prevProps.showTomographyAnnotation !== this.props.showTomographyAnnotation) {
            this.updateTomographySliceTexture();
        }

        const { width, height } = this.computeDims();
        if (this.viewer !== null) {
            this.viewer.setSize(width, height);
            this.renderCompartments();
            this.renderPenetrations();
        }
    }

    public render(): React.ReactNode {
        const playerSliderProps: PlayerSliderProps = {
            busy: this.props.busy,
            frameRate: this.state.frameRate,
            isPlaying: this.state.isPlaying,
            isRecording: this.state.isRecording,
            loopAnimation: this.state.loopAnimation,
            timeMax: this.state.timeMax,
            timeMin: this.state.timeMin,
            timeStep: this.state.timeStep,
            timeVal: this.state.timeVal,
            onFrameRateUpdate: (frameRate: number): void => {
                this.setState({frameRate});
            },
            onLoopToggle: this.handleLoopToggle.bind(this),
            onPlayToggle: this.handlePlayToggle.bind(this),
            onRecordToggle: this.handleRecordToggle.bind(this),
            onSliderChange: this.handleSliderChange.bind(this),
            onStopClick: this.handleStopClick.bind(this),
        };


        const timeseriesMappersProps: TimeseriesMappersProps = {
            busy: this.props.busy,
            constants: this.props.constants,
            colorTimeseries: this.state.colorTimeseries,
            colorBounds: this.state.colorBounds,
            colorGamma: this.state.colorGamma,
            colorMapping: this.state.colorMapping,

            opacityTimeseries: this.state.opacityTimeseries,
            opacityBounds: this.state.opacityBounds,
            opacityGamma: this.state.opacityGamma,

            radiusTimeseries: this.state.radiusTimeseries,
            radiusBounds: this.state.radiusBounds,
            radiusGamma: this.state.radiusGamma,
            timeseriesList: Array.from(this.props.availableTimeseries),
            onCommit: (aestheticProps: AestheticProps): void => {
                this.setState(_.extend(aestheticProps, {showMappers: false}), () => this.propagateAestheticCommit())
            },
        };

        const header = this.renderHeader();
        const footer = this.renderFooter();
        return (
            <Grid container>
                <Grid item xs={12}>
                    {header}
                </Grid>
                <Grid container item
                      xs={12}
                      style={{
                          borderLeft: "1px solid black",
                          borderRight: "1px solid black",
                          margin: 0,
                          padding: "20px",
                      }}>
                    <Grid item xs={12} id={this.canvasContainerId} />
                    <Grid item xs={12}>
                        <PlayerSlider {...playerSliderProps} />
                    </Grid>
                </Grid>
                <Grid item xs={12}>
                    <Drawer anchor="bottom"
                            open={this.state.showMappers}
                            onClose={() => this.setState({showMappers: false})} >

                        <TimeseriesMappers {...timeseriesMappersProps} />
                    </Drawer>
                </Grid>
                <Grid item xs={12}>
                    {footer}
                </Grid>
            </Grid>
        );
    }
}