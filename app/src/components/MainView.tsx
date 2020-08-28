import React from 'react';
import * as _ from 'underscore';

import Grid from '@material-ui/core/Grid';

import { APIClient } from '../apiClient';
import { AVConstants } from '../constants';

import { ISettingsResponse, IPenetrationData, ITimeseriesListResponse, IUnitStatsListResponse } from '../models/apiModels';
import { CompartmentTree } from '../models/compartmentTree';
import { Predicate, IFilterCondition } from '../models/filter';
import { PointModel, IPointSummary } from '../models/pointModel';

import { IAesthetics } from '../viewmodels/aestheticMapping';
import { ICompartmentView } from '../viewmodels/compartmentViewModel';

import { PlayerSlider, IPlayerSliderProps } from './AnimationControls/PlayerSlider';
import { CompartmentNode } from './FilterControls/CompartmentNode';
import { FilterControls, IFilterControlsProps } from './FilterControls/FilterControls';
import { TimeseriesControls, ITimeseriesControlsProps } from './TimeseriesControls/TimeseriesControls';
import { Viewer3D, IViewer3DProps } from './Viewers/Viewer3D';


interface ITimeseriesData {
    penetrationId: string,
    times: number[],
    values: number[],
}

interface IUnitStatsData {
    penetrationId: string,
    values: number[],
}

export interface IMainViewProps {
    availablePenetrations: IPenetrationData[],
    compartmentTree: CompartmentTree,
    visibleCompartments: ICompartmentView[],
    constants: AVConstants,
    settings: ISettingsResponse,
    onUpdateCompartmentViews(compartments: ICompartmentView[]): void,
    onUpdateSelectedCompartments(added: string[], removed: string[]): void,
}

interface IMainViewState {
    aesthetics: IAesthetics[],
    colorBounds: number[],
    filterConditions: IFilterCondition[],
    frameRate: number,
    isPlaying: boolean,
    loopAnimation: 'once' | 'repeat',
    opacityBounds: number[],
    radiusBounds: number[],
    rootNode: CompartmentNode,
    selectedColor: string,
    selectedOpacity: string,
    selectedRadius: string,
    selectedStat: string,
    subsetOnly: boolean,
    timeMin: number,
    timeMax: number,
    timeStep: number,
    timeVal: number,
}

export class MainView extends React.Component<IMainViewProps, IMainViewState> {
    private apiClient: APIClient;
    private pointVisibilities: Map<string, number[][]>;
    private statsData: Map<string, IUnitStatsData[]>;
    private timeseriesData: Map<string, ITimeseriesData[]>;

    constructor(props: IMainViewProps) {
        super(props);

        const rootNode = this.props.compartmentTree.getCompartmentSubsetTree(this.props.settings);
        this.state = {
            aesthetics: [],
            colorBounds: [0, 255],
            filterConditions: [],
            frameRate: 30,
            isPlaying: false,
            loopAnimation: 'once',
            opacityBounds: [0.01, 1],
            radiusBounds: [5, 500],
            rootNode: new CompartmentNode(rootNode, true),
            selectedColor: 'nothing',
            selectedOpacity: 'nothing',
            selectedRadius: 'nothing',
            selectedStat: 'nothing',
            subsetOnly: true,
            timeMin: 0,
            timeMax: 0,
            timeStep: 0.01,
            timeVal: 0,
        }

        this.apiClient = new APIClient(this.props.constants.apiEndpoint);
        this.pointVisibilities = new Map<string, number[][]>();
        this.statsData = new Map<string, IUnitStatsData[]>();
        this.timeseriesData = new Map<string, ITimeseriesData[]>();
    }

    private animate() {
        if (this.state.isPlaying) {
            const newVal = this.state.timeVal + this.state.timeStep > this.state.timeMax ?
                            this.state.timeMin : this.state.timeVal + this.state.timeStep;
            
            let callback = () => {};
            let newState = { timeVal: newVal };

            if (newVal > this.state.timeMin || this.state.loopAnimation === 'repeat') {
                callback = () => { setTimeout(this.animate.bind(this), 1000/this.state.frameRate); };
            } else {
                newState = _.extend(newState, { isPlaying: false });
            }

            this.setState(newState, callback);
        }
    }

    private fetchAndUpdateTimeseries(value: string) {
        if (value !== 'nothing' && !this.timeseriesData.has(value)) {
            this.apiClient.fetchTimeseriesById(value)
                .then((res: any) => res.data)
                .then((responseData: ITimeseriesListResponse) => {
                    let seriesData: ITimeseriesData[] = [];

                    responseData.timeseries.forEach((data) => {
                        if (data.stride === 0) {
                            return;
                        }

                        seriesData.push({
                            penetrationId: data.penetrationId,
                            times: data.data.slice(0, data.stride),
                            values: data.data.slice(data.stride),
                        });
                    });

                    this.timeseriesData.set(value, seriesData);
                    this.updateAesthetics();
                })
                .catch((err: Error) => console.error(err));
        } else {
            this.updateAesthetics();
        }
    }

    private fetchAndUpdateUnitStats(value: string) {
        if (value !== 'nothing' && !this.statsData.has(value)) {
            this.apiClient.fetchUnitStatsById(value)
                .then((res: any) => res.data)
                .then((responseData: IUnitStatsListResponse) => {
                    let statsData: IUnitStatsData[] = [];

                    responseData.unitStats.forEach((data) => {
                        statsData.push({
                            penetrationId: data.penetrationId,
                            values: data.data
                        });
                    });

                    this.statsData.set(value, statsData);
                    this.setState({ selectedStat: value });
                })
                .catch((err: Error) => console.error(err));
        } else {
            this.setState({ selectedStat: value });
        }
    }

    private getVisibilityByPenetrationId(penetrationId: string): number[] {
        const penetrationIds = this.props.availablePenetrations.map((penetrationData) => penetrationData.penetrationId);
        const penIdx = penetrationIds.indexOf(penetrationId);
        let visibility: number[] = [];

        if (!this.pointVisibilities.has(penetrationId) && penIdx > -1) {
            visibility = new Array(this.props.availablePenetrations[penIdx].ids.length);
            visibility.fill(1);
        } else if (this.pointVisibilities.has(penetrationId)) {
            const visibilityArr = this.pointVisibilities.get(penetrationId);
            visibility = visibilityArr[visibilityArr.length - 1];
        }

        return visibility;
    }

    private handleFrameRateUpdate(frameRate: number) {
        this.setState({ frameRate: frameRate });
    }

    private handleLoopToggle() {
        const newLoop = this.state.loopAnimation === 'once' ? 'repeat' : 'once';
        this.setState({ loopAnimation: newLoop });
    }

    private handleNewFilterCondition(condition: IFilterCondition) {
        let conditions = this.state.filterConditions.slice();
        conditions.push(condition);

        this.props.availablePenetrations.forEach((penetrationData) => {
            const penetrationId = penetrationData.penetrationId;

            // collect stats data for points in this penetration
            const penStatsData = new Map<string, IUnitStatsData>();
            this.statsData.forEach((statValues, statName) => {
                const idx = statValues.map(v => v.penetrationId).indexOf(penetrationId);
                if (idx === -1) {
                    return;
                }

                penStatsData.set(statName, statValues[idx]);
            });

            // filter points
            let pointModels: PointModel[] = [];
            for (let i = 0; i < penetrationData.ids.length; i++) {
                const summary: IPointSummary = {
                    compartment: penetrationData.compartments[i],
                    coordinates: penetrationData.coordinates.slice(i*3, 3),
                    id: penetrationData.ids[i],
                    penetrationId: penetrationId,
                };
                let pointModel = new PointModel(summary);

                penStatsData.forEach((statValues, statName) => {
                    pointModel.setStat(statName, statValues.values[i]);
                });
                pointModels.push(pointModel);
            }

            // logical AND or OR on latest filter condition
            const predicate = new Predicate(condition);
            let pointMask = predicate.eval(pointModels);

            let newVisibility = this.getVisibilityByPenetrationId(penetrationId).slice();
            pointMask.forEach((p, i) => {
                if (condition.booleanOp === 'OR' && p) {
                    newVisibility[i] = 1;
                } else if (condition.booleanOp === 'AND' && !p) {
                    newVisibility[i] = 0;
                }
            });

            this.pointVisibilities.get(penetrationId).push(newVisibility);
        });

        this.setState({ filterConditions: conditions }, () => {
            this.updateAesthetics();
        });
    }

    private handleOpacitySelectionChange(event: React.ChangeEvent<{
        name?: string;
        value: any;
    }>) {
        const value = event.target.value as string;
        let newState = { selectedOpacity: value };

        if (value !== 'nothing' && this.state.selectedRadius === value) {
            newState = _.extend(newState, { selectedRadius: 'nothing' });
        }

        if (value !== 'nothing' && this.state.selectedColor === value) {
            newState = _.extend(newState, { selectedColor: 'nothing' });
        }

        this.setState(newState, () => this.fetchAndUpdateTimeseries(value));
    }

    private handleOpacitySliderChange(event: any, newValue: number[], commit: boolean) {
        this.setState({ opacityBounds: newValue }, () => {
            if (commit) {
                this.updateAesthetics();
            }
        });
    }

    private handlePlayToggle() {
        this.setState({ isPlaying: !this.state.isPlaying }, () => {
            this.animate()
        });
    }

    private handleRadiusSelectionChange(event: React.ChangeEvent<{
        name?: string;
        value: any;
    }>) {
        const value = event.target.value as string;
        let newState = { selectedRadius: value };

        if (value !== 'nothing' && this.state.selectedOpacity === value) {
            newState = _.extend(newState, { selectedOpacity: 'nothing' });
        }

        if (value !== 'nothing' && this.state.selectedColor === value) {
            newState = _.extend(newState, { selectedColor: 'nothing' });
        }

        this.setState(newState, () => this.fetchAndUpdateTimeseries(value));
    }

    private handleRadiusSliderChange(event: any, newValue: number[], commit: boolean) {
        this.setState({ radiusBounds: newValue }, () => {
            if (commit) {
                this.updateAesthetics();
            }
        });
    }

    private handleSliderChange(_event: any, timeVal: number) {
        this.setState({ timeVal });
    }

    private handleStopClick() {
        this.setState({ timeVal: this.state.timeMin, isPlaying: false });
    }

    private handleStatSelectionChange(event: React.ChangeEvent<{
        name?: string;
        value: string;
    }>) {
        const value = event.target.value;
        this.fetchAndUpdateUnitStats(value);
    }

    private transformValues(data: number[], transformBounds: number[]): number[] {
        let dataMin = data[0];
        let dataMax = data[0];
        data.forEach(x => {
            dataMin = Math.min(x, dataMin);
            dataMax = Math.max(x, dataMax);
        });
        const dataRange = dataMax - dataMin;

        const transformMin = transformBounds[0];
        const transformMax = transformBounds[1];
        const transformRange = transformMax - transformMin;

        let xValues;
        if (dataMin === dataMax) {
            xValues = data.map(_x => (transformMax - transformMin) / 2);
        } else {
            xValues = data.map(x =>
                transformMin + transformRange*(x - dataMin)/dataRange
            );
        }

        return xValues;
    }

    private updateAesthetics() {
        let timeMin = 0;
        let timeMax = 0;

        let visiblePenetrations = this.props.availablePenetrations.map(
            value => value.penetrationId
        );

        if (this.state.selectedColor !== 'nothing') {
            visiblePenetrations = _.intersection(
                visiblePenetrations,
                this.timeseriesData.get(this.state.selectedColor).map(
                    seriesData => seriesData.penetrationId
                )
            );
        }

        if (this.state.selectedOpacity !== 'nothing') {
            visiblePenetrations = _.intersection(
                visiblePenetrations,
                this.timeseriesData.get(this.state.selectedOpacity).map(
                    seriesData => seriesData.penetrationId
                )
            );
        }

        if (this.state.selectedRadius !== 'nothing') {
            visiblePenetrations = _.intersection(
                visiblePenetrations,
                this.timeseriesData.get(this.state.selectedRadius).map(
                    seriesData => seriesData.penetrationId
                )
            );
        }

        let aesthetics: IAesthetics[] = [];

        const colorData = this.state.selectedColor === 'nothing' ? null : this.timeseriesData.get(this.state.selectedColor);
        const opacityData = this.state.selectedOpacity === 'nothing' ? null : this.timeseriesData.get(this.state.selectedOpacity);
        const radiusData = this.state.selectedRadius === 'nothing' ? null : this.timeseriesData.get(this.state.selectedRadius);

        visiblePenetrations.forEach((penetrationId) => {
            const penColor = colorData === null ? null : colorData.filter((data) => data.penetrationId === penetrationId)[0];
            if (penColor !== null) {
                const colorTimes = penColor.times;
                timeMin = Math.min(timeMin, colorTimes[0]);
                timeMax = Math.max(timeMax, colorTimes[colorTimes.length - 1]);
            }

            const penOpacity = opacityData === null ? null : opacityData.filter((data) => data.penetrationId === penetrationId)[0];
            if (penOpacity !== null) {
                const opacityTimes = penOpacity.times;
                timeMin = Math.min(timeMin, opacityTimes[0]);
                timeMax = Math.max(timeMax, opacityTimes[opacityTimes.length - 1]);
            }

            const penRadius = radiusData === null ? null : radiusData.filter((data) => data.penetrationId === penetrationId)[0];
            if (penRadius !== null) {
                const radiusTimes = penRadius.times;
                timeMin = Math.min(timeMin, radiusTimes[0]);
                timeMax = Math.max(timeMax, radiusTimes[radiusTimes.length - 1]);
            }

            const aesthetic: IAesthetics = {
                penetrationId: penetrationId,
                color: penColor === null ? null : {
                    timeseriesId: this.state.selectedColor,
                    times: penColor.times,
                    values: this.transformValues(penColor.values, this.state.colorBounds)
                },
                opacity: penOpacity === null ? null : {
                    timeseriesId: this.state.selectedOpacity,
                    times: penOpacity.times,
                    values: this.transformValues(penOpacity.values, this.state.opacityBounds)
                },
                radius: penRadius === null ? null : {
                    timeseriesId: this.state.selectedRadius,
                    times: penRadius.times,
                    values: this.transformValues(penRadius.values, this.state.radiusBounds)
                },
                visible: this.getVisibilityByPenetrationId(penetrationId),
            };
            aesthetics.push(aesthetic);
        });

        let timeVal = this.state.timeVal;
        if (timeMin !== this.state.timeMin || timeMax !== this.state.timeMax || timeVal < timeMin || timeVal > timeMax) {
            timeVal = timeMin;
        }
        this.setState({ aesthetics, timeMax, timeMin, timeVal });
    }

    public componentDidUpdate(prevProps: Readonly<IMainViewProps>) {
        if (!_.isEqual(prevProps.availablePenetrations, this.props.availablePenetrations)) {
            // set all points to visible by default
            this.pointVisibilities = new Map<string, number[][]>();
            this.props.availablePenetrations.forEach((penetrationData) => {
                const penetrationId = penetrationData.penetrationId;
                const nPoints = penetrationData.ids.length;
                const visible = new Array<number>(nPoints);
                visible.fill(1);

                this.pointVisibilities.set(penetrationId, [visible]);
            });

            this.setState({ filterConditions: [] }, () => this.updateAesthetics());
        }
    }

    public render() {
        const viewer3DProps: IViewer3DProps = {
            aestheticMappings: this.state.aesthetics,
            availablePenetrations: this.props.availablePenetrations,
            constants: this.props.constants,
            compartmentTree: this.props.compartmentTree,
            frameRate: this.state.frameRate,
            isPlaying: this.state.isPlaying,
            loopAnimation: this.state.loopAnimation,
            settings: this.props.settings,
            timeMin: this.state.timeMin,
            timeMax: this.state.timeMax,
            timeStep: this.state.timeStep,
            timeVal: this.state.timeVal,
            visibleCompartments: this.props.visibleCompartments,
            onUpdateCompartmentViews: this.props.onUpdateCompartmentViews,
        };

        const timeseriesControlsProps: ITimeseriesControlsProps = {
            opacityBounds: this.state.opacityBounds,
            radiusBounds: this.state.radiusBounds,
            selectedOpacity: this.state.selectedOpacity,
            selectedRadius: this.state.selectedRadius,
            timeseries: _.uniq(
                _.flatten(this.props.availablePenetrations.map(
                    pen => pen.timeseries
                )).sort(), true
            ),
            onOpacitySelectionChange: this.handleOpacitySelectionChange.bind(this),
            onOpacitySliderChange: this.handleOpacitySliderChange.bind(this),
            onRadiusSelectionChange: this.handleRadiusSelectionChange.bind(this),
            onRadiusSliderChange: this.handleRadiusSliderChange.bind(this),
        };

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

        const filterControlProps: IFilterControlsProps = {
            availablePenetrations: this.props.availablePenetrations,
            constants: this.props.constants,
            filterConditions: this.state.filterConditions,
            selectedStat: this.state.selectedStat,
            statsData: this.state.selectedStat !== 'nothing' ?
                _.union(
                    ...(this.statsData.get(this.state.selectedStat).map(entry => entry.values))
                ) : [],
            onNewFilterCondition: this.handleNewFilterCondition.bind(this),
            onStatSelectionChange: this.handleStatSelectionChange.bind(this),
        }

        const style = { padding: 20 };
        return (
            <div style={style}>
                <Grid container
                      spacing={2}>
                    <Grid item xs={5}>
                        <Viewer3D {...viewer3DProps} />
                    </Grid>
                    <Grid item xs={7}>
                        <FilterControls {...filterControlProps} />
                    </Grid>
                    <Grid item xs={5}>
                        <PlayerSlider {...playerSliderProps} />
                    </Grid>
                    <Grid item xs={7}>
                        <TimeseriesControls {...timeseriesControlsProps}/>
                    </Grid>
                </Grid>
            </div>
        );
    }
}