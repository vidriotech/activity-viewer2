import React from "react";
import * as _ from "underscore";
import Grid from "@material-ui/core/Grid";

// eslint-disable-next-line import/no-unresolved
import {APIClient} from "../../apiClient";
// eslint-disable-next-line import/no-unresolved
import {AVConstants} from "../../constants";

// eslint-disable-next-line import/no-unresolved
import {AestheticMapping, ColorMapping, ScalarMapping, TransformParams} from "../../models/aestheticMapping";
// eslint-disable-next-line import/no-unresolved
import {AVSettings} from "../../models/apiModels";
// eslint-disable-next-line import/no-unresolved
import {ColorLUT} from "../../models/colorMap";
// eslint-disable-next-line import/no-unresolved
import {SliceImageType, SliceType} from "../../models/enums";
// eslint-disable-next-line import/no-unresolved
import {Predicate, PropIneqPredicate} from "../../models/predicateModels";
// eslint-disable-next-line import/no-unresolved
import {TimeseriesData, TimeseriesSummary} from "../../models/timeseries";
// eslint-disable-next-line import/no-unresolved
import {CompartmentNodeView} from "../../viewmodels/compartmentViewModel";
// eslint-disable-next-line import/no-unresolved
import {BrainViewer} from "../../viewers/brainViewer";

// eslint-disable-next-line import/no-unresolved
// eslint-disable-next-line import/no-unresolved
import Typography from "@material-ui/core/Typography";
// eslint-disable-next-line import/no-unresolved
import {tab10Blue} from "../../styles";
import {ChevronLeft, ChevronRight, LockOpen, LockOpenOutlined, LockOutlined} from "@material-ui/icons";
import IconButton from "@material-ui/core/IconButton";
import CircularProgress from "@material-ui/core/CircularProgress";
// eslint-disable-next-line import/no-unresolved
import {Penetration} from "../../models/penetration";
// eslint-disable-next-line import/no-unresolved
import {TomographySlice} from "../../models/tomographySlice";

export interface ViewerContainerProps {
    compartmentViewTree: CompartmentNodeView;
    constants: AVConstants;
    settings: AVSettings;

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

    selectedPenetrations: Map<string, Penetration>;
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

interface ViewerContainerState {
    dialogOpen: boolean;
    frameRate: number;
    imageType: SliceImageType;
    renderHeight: number;
    renderWidth: number;

    isPlaying: boolean;
    isRecording: boolean;
    loopAnimation: "once" | "repeat";
    timeMin: number;
    timeMax: number;
    timeStep: number;
    timeVal: number;

    rotateLocked: boolean;
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
    private tsData: Map<string, TimeseriesData[]>;

    private colorMappings: Map<string, ColorMapping>;
    private opacityMappings: Map<string, ScalarMapping>;
    private radiusMappings: Map<string, ScalarMapping>;

    private colorLUTs: Map<string, ColorLUT>;

    constructor(props: ViewerContainerProps) {
        super(props);

        this.state = {
            dialogOpen: false,
            frameRate: 30,
            imageType: SliceImageType.ANNOTATION,
            renderHeight: 0,
            renderWidth: 0,

            isPlaying: false,
            isRecording: false,
            loopAnimation: "once",
            timeMin: NaN,
            timeMax: NaN,
            timeStep: NaN,
            timeVal: 0,
            rotateLocked: false,
        };

        this.apiClient = new APIClient(this.props.constants.apiEndpoint);
        this.recordedBlobs = [];

        this.tsSummaries = new Map<string, TimeseriesSummary>();
        this.tsData = new Map<string, TimeseriesData[]>();

        this.colorLUTs = new Map<string, ColorLUT>();
        this.colorLUTs.set("nothing", this.props.constants.defaultColorLUT);

        this.colorMappings = new Map<string, ColorMapping>();
        this.opacityMappings = new Map<string, ScalarMapping>();
        this.radiusMappings = new Map<string, ScalarMapping>();
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
        const v = new BrainViewer(this.props.constants, this.props.settings.epochs);
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
        this.apiClient.fetchSliceData(this.props.tomographySliceType, coordinate)
            .then((res) => res.data)
            .then((sliceData) =>  TomographySlice.fromResponse(sliceData))
            .then((slice) => {
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

    private fetchAndUpdateTimeseriesData(timeseriesId: string): void {
        if (timeseriesId === "nothing") {
            return;
        } else if (!this.tsSummaries.has(timeseriesId)) {
            this.fetchTimeseriesSummary(timeseriesId)
                .then(() => {
                    this.fetchAndUpdateTimeseriesData(timeseriesId);
                })
                .catch((err) => console.error(err));
        } else {
            const nPenetrations = this.props.selectedPenetrations.size;

            const data = this.tsData.has(timeseriesId) ?
                this.tsData.get(timeseriesId).slice() :
                [];


            const availablePenetrations = Array.from(this.props.selectedPenetrations.keys());
            const savedPenetrations = data.map((d) => d.penetrationId);
            const diff = _.difference(availablePenetrations, savedPenetrations).slice(0, 10);

            if (diff.length === 0) {
                if (this.props.colorTimeseries === timeseriesId) {
                    this.updateColorMappings();
                } else if (this.props.opacityTimeseries === timeseriesId) {
                    this.updateScalarMappings("opacity");
                } else if (this.props.radiusTimeseries === timeseriesId) {
                    this.updateScalarMappings("radius");
                }
            } else {
                this.apiClient.fetchPenetationTimeseries([timeseriesId], diff)
                    .then((res) => res.data)
                    .then((res) => {
                        const newData = data.concat(res.timeseries[0].penetrations);
                        this.tsData.set(timeseriesId, newData);

                        let progress = newData.length;
                        const otherTs = _.difference([
                            this.props.colorTimeseries,
                            this.props.opacityTimeseries,
                            this.props.radiusTimeseries,
                        ], [timeseriesId, "nothing"]);

                        const coef = 1 + otherTs.length;
                        otherTs.forEach((t) => {
                            if (this.tsData.has(t)) {
                                progress += this.tsData.get(t).length;
                            }
                        });

                        const nTimeseriesToFetch = coef * nPenetrations;
                        const progressMessage = progress === coef * nPenetrations ?
                            "Ready." :
                            `Fetched ${progress}/${nTimeseriesToFetch} timeseries.`;

                        this.props.onUpdateProgress(progress / (coef * nPenetrations), progressMessage);
                        this.fetchAndUpdateTimeseriesData(timeseriesId);
                    })
                    .catch((err) => console.error(err));
            }
        }
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
        let queue: CompartmentNodeView[] = [this.props.compartmentViewTree];
        while (queue.length > 0) {
            const compartmentNodeView: CompartmentNodeView = queue.splice(0, 1)[0];
            viewer.setCompartmentVisible(compartmentNodeView);
            queue = queue.concat(compartmentNodeView.children);
        }
    }

    private renderHeader(): React.ReactElement {
        const dataPanelHeader = (
            this.props.showDataPanel ?
                null :
                <Grid item
                      justify="flex-start"
                      xs={1}>
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
                <Grid item
                      justify="flex-end"
                      xs={1}>
                    <IconButton color="inherit"
                                size="small"
                                onClick={(): void => this.props.onExpand("r")}>
                        <ChevronLeft />
                    </IconButton>
                </Grid>
        );

        const lockButton = (
            <Grid item
                  justify="flex-end"
                  xs={1}>
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
            <Grid container
                  item
                  spacing={0}
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
                    {this.props.progress < 1 ?
                        <Grid item xs={1}>
                            <CircularProgress color="secondary"
                                              variant="indeterminate"
                                              value={100 * this.props.progress}
                                              size={20} />

                        </Grid> : null
                    }
                    {this.props.progress < 1 ?
                        <Grid item xs>
                            <Typography align="left" gutterBottom>
                                {this.props.progressMessage}
                            </Typography>
                        </Grid> : null
                    }
                </Grid>
                {lockButton}
                {physiologyPanelHeader}
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

        this.viewer.updatePenetrationAttributes();
    }

    private setAestheticAssignments(): void {
        const mappings: AestheticMapping[] = [];

        this.props.selectedPenetrations.forEach((penetration, id) => {
            if (penetration.nUnits == 0) {
                return;
            }

            if (!this.viewer.hasPenetration(id)) {
                this.viewer.loadPenetration(penetration);
            }

            // set aesthetics
            if (!this.colorMappings.has(id)) {
                this.colorMappings.set(id, null);
            }
            if (!this.opacityMappings.has(id)) {
                this.opacityMappings.set(id, null);
            }
            if (!this.radiusMappings.has(id)) {
                this.radiusMappings.set(id, null);
            }

            mappings.push({
                penetrationId: id,
                color: this.colorMappings.get(id),
                opacity: this.opacityMappings.get(id),
                radius: this.radiusMappings.get(id),
                show: penetration.visible
            });
        });

        this.viewer.setAestheticAssignments(mappings);
    }

    private updateColorMappings(): void {
        if (!this.colorLUTs.has(this.props.colorMapping)) {
            this.apiClient.fetchColorMapping(this.props.colorMapping)
                .then((res) => res.data)
                .then((lut) => {
                    this.colorLUTs.set(this.props.colorMapping, lut);
                    this.updateColorMappings();
                });
        } else {
            const colorTimeseries = this.props.colorTimeseries;
            this.props.selectedPenetrations.forEach((penetration, id) => {
                let colorMapping: ColorMapping = null;

                if (colorTimeseries !== "nothing" && this.tsData.has(colorTimeseries)) {
                    const timeseriesData = this.tsData.get(colorTimeseries)
                        .filter((d) => d.penetrationId === id)[0];

                    if (timeseriesData !== undefined) {
                        const summary = this.tsSummaries.get(colorTimeseries);
                        const transformParams: TransformParams = {
                            domainBounds: [summary.minVal, summary.maxVal],
                            targetBounds: this.props.colorBounds,
                            gamma: this.props.colorGamma
                        };

                        colorMapping = {
                            timeseriesData,
                            transformParams,
                            colorLUT: this.colorLUTs.get(this.props.colorMapping)
                        };
                    }
                }

                this.colorMappings.set(id, colorMapping);
            });

            this.setAestheticAssignments();
            this.renderPenetrations();
        }
    }

    private updateScalarMappings(aesthetic: "opacity" | "radius"): void {
        let timeseries: string;
        let bounds: [number, number];
        let gamma: number;
        let mappings: Map<string, ScalarMapping>;

        if (aesthetic === "opacity") {
            timeseries = this.props.opacityTimeseries;
            bounds = this.props.opacityBounds;
            gamma = this.props.opacityGamma;
            mappings = this.opacityMappings;
        } else if (aesthetic === "radius") {
            timeseries = this.props.radiusTimeseries;
            bounds = this.props.radiusBounds;
            gamma = this.props.radiusGamma;
            mappings = this.radiusMappings;
        } else {
            return;
        }

        this.props.selectedPenetrations.forEach((penetration, id) => {
            let mapping: ScalarMapping = null;

            if (timeseries !== "nothing" && this.tsData.has(timeseries)) {
                const timeseriesData = this.tsData.get(timeseries)
                    .filter((d) => d.penetrationId === id)[0];

                if (timeseriesData !== undefined) {
                    const summary = this.tsSummaries.get(timeseries);
                    const transformParams: TransformParams = {
                        domainBounds: [summary.minVal, summary.maxVal],
                        targetBounds: bounds,
                        gamma: gamma
                    };

                    mapping = {
                        timeseriesData,
                        transformParams,
                    };
                }
            }

            mappings.set(id, mapping);
        });

        this.setAestheticAssignments();
        this.renderPenetrations();
    }

    private updateDims(): void {
        const { width, height } = this.computeDims();
        this.setState({ renderWidth: width, renderHeight: height });

        if (this.viewer !== null) {
            this.viewer.setSize(width, height);
        }
    }

    private updatePlayerTimes(): void {
        this.fetchTimeseriesSummary(this.props.colorTimeseries)
            .then(() => this.fetchTimeseriesSummary(this.props.opacityTimeseries))
            .then(() => this.fetchTimeseriesSummary(this.props.radiusTimeseries))
            .then(() => {
                let timeMin = NaN;
                let timeMax = NaN;
                let timeStep = NaN;

                const summaries: TimeseriesSummary[] = [];
                if (this.props.colorTimeseries !== "nothing") {
                    summaries.push(this.tsSummaries.get(this.props.colorTimeseries));
                }
                if (this.props.opacityTimeseries !== "nothing") {
                    summaries.push(this.tsSummaries.get(this.props.opacityTimeseries));
                }
                if (this.props.radiusTimeseries !== "nothing") {
                    summaries.push(this.tsSummaries.get(this.props.radiusTimeseries));
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
                    timeVal: timeMin
                }, () => {
                    if (this.viewer) {
                        this.viewer.setTime(this.state.timeMin, this.state.timeMax, this.state.timeStep, this.state.timeVal);
                        this.setAestheticAssignments();
                    }
                });
            });
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

        const timeseriesDidUpdate = (
            prevProps.colorTimeseries !== this.props.colorTimeseries ||
                prevProps.opacityTimeseries !== this.props.opacityTimeseries ||
                prevProps.radiusTimeseries !== this.props.radiusTimeseries ||
                prevProps.selectedPenetrations !== this.props.selectedPenetrations
        );

        let aestheticsDidUpdate = timeseriesDidUpdate;

        if (prevProps.colorTimeseries !== this.props.colorTimeseries ||
            prevProps.colorBounds !== this.props.colorBounds ||
            prevProps.colorGamma !== this.props.colorGamma ||
            prevProps.colorMapping !== this.props.colorMapping
        ) {
            aestheticsDidUpdate = true;
            this.fetchAndUpdateTimeseriesData(this.props.colorTimeseries);
            this.updateColorMappings();
        }

        if (prevProps.opacityTimeseries !== this.props.opacityTimeseries ||
            prevProps.opacityBounds !== this.props.opacityBounds ||
            prevProps.opacityGamma !== this.props.opacityGamma
        ) {
            aestheticsDidUpdate = true;
            this.fetchAndUpdateTimeseriesData(this.props.opacityTimeseries);
            this.updateScalarMappings("opacity");
        }

        if (prevProps.radiusTimeseries !== this.props.radiusTimeseries ||
            prevProps.radiusBounds !== this.props.radiusBounds ||
            prevProps.radiusGamma !== this.props.radiusGamma
        ) {
            aestheticsDidUpdate = true;
            this.fetchAndUpdateTimeseriesData(this.props.radiusTimeseries);
            this.updateScalarMappings("radius");
        }

        if (timeseriesDidUpdate) {
            this.updatePlayerTimes();
        } else if (aestheticsDidUpdate) {
            this.setAestheticAssignments();
        }

        const { width, height } = this.computeDims();
        if (this.viewer !== null) {
            this.viewer.setSize(width, height);
            this.renderCompartments();
            this.renderPenetrations();
        }
    }

    public render(): React.ReactNode {
        // const playerSliderProps: PlayerSliderProps = {
        //     busy: this.props.busy,
        //     frameRate: this.state.frameRate,
        //     isPlaying: this.state.isPlaying,
        //     isRecording: this.state.isRecording,
        //     loopAnimation: this.state.loopAnimation,
        //     timeMax: this.state.timeMax,
        //     timeMin: this.state.timeMin,
        //     timeStep: this.state.timeStep,
        //     timeVal: this.state.timeVal,
        //     onFrameRateUpdate: (frameRate: number): void => {
        //         this.setState({frameRate});
        //     },
        //     onLoopToggle: this.handleLoopToggle.bind(this),
        //     onPlayToggle: this.handlePlayToggle.bind(this),
        //     onRecordToggle: this.handleRecordToggle.bind(this),
        //     onSliderChange: this.handleSliderChange.bind(this),
        //     onStopClick: this.handleStopClick.bind(this),
        // };
        //
        // const dialog = (
        //     <Dialog fullWidth
        //             open={this.state.dialogOpen}
        //             onClose={(): void => this.setState({dialogOpen: false})}>
        //         <DialogTitle id={"form-dialog-title"}>Slice and dice</DialogTitle>
        //         <DialogContent>
        //             <SliceControl constants={this.props.constants}
        //                           onCommit={this.handleSliceCommit.bind(this)} />
        //         </DialogContent>
        //     </Dialog>
        // );
        //
        // const imageTypeSwitch = (
        //     <FormControl component="fieldset">
        //         <FormLabel component="legend">Image type</FormLabel>
        //         <RadioGroup row
        //                     aria-label="image type"
        //                     name="imgType"
        //                     value={this.state.imageType}
        //                     onChange={(evt): void => {
        //                         this.setState({imageType: SliceImageType.ANNOTATION})
        //                     }}>
        //             <FormControlLabel value="annotation"
        //                               disabled={this.props.busy}
        //                               control={<Radio />}
        //                               label="A" />
        //             <FormControlLabel value="template"
        //                               disabled={this.props.busy}
        //                               control={<Radio />}
        //                               label="T" />
        //         </RadioGroup>
        //     </FormControl>
        // );

        const header = this.renderHeader();

        return (
            <Grid container>
                <Grid item xs={12}>
                    {header}
                </Grid>
                <Grid container item
                      xs={12}
                      style={{
                          "borderLeft": "1px solid black",
                          "borderRight": "1px solid black",
                          margin: 0}}>
                    <Grid item xs={12} id={this.canvasContainerId}>
                        {/*<div style={{ padding: 40 }}*/}
                        {/*     id={this.canvasContainerId}>*/}
                        {/*</div>*/}
                    </Grid>
                </Grid>
                {/*<Grid item xs={4}>*/}
                {/*    {switchButton}*/}
                {/*</Grid>*/}
                {/*<Grid item xs={8}>*/}
                {/*    <PlayerSlider {...playerSliderProps} />*/}
                {/*</Grid>*/}
                {/*<Grid item xs>*/}
                {/*    {dialog}*/}
                {/*</Grid>*/}
            </Grid>
        );
    }
}