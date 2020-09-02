import React from 'react';
import * as _ from 'underscore';

import Grid from '@material-ui/core/Grid';

import { APIClient } from '../apiClient';
import { AVConstants } from '../constants';

import { ISettingsResponse, IPenetrationData, ITimeseriesListResponse, IUnitStatsListResponse } from '../models/apiModels';
import { CompartmentTree } from '../compartmentTree';
import { PointModel } from '../models/pointModel';
import { Predicate } from '../models/predicateModels';

import { IAesthetics } from '../viewmodels/aestheticMapping';
import { ICompartmentNodeView } from '../viewmodels/compartmentViewModel';

import { FilterControls, IFilterControlsProps } from './FilterControls/FilterControls';
import { TimeseriesControls, ITimeseriesControlsProps } from './TimeseriesControls/TimeseriesControls';
import { ViewerContainer, IViewerContainerProps } from './Viewers/ViewerContainer';


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
    constants: AVConstants,
    settings: ISettingsResponse,
}

interface IMainViewState {
    aesthetics: IAesthetics[],
    colorBounds: number[],
    compartmentSubsetOnly: boolean,
    compartmentViewTree: ICompartmentNodeView,
    filterPredicate: Predicate,
    frameRate: number,
    isPlaying: boolean,
    loopAnimation: 'once' | 'repeat',
    opacityBounds: number[],
    radiusBounds: number[],
    selectedColor: string,
    selectedOpacity: string,
    selectedRadius: string,
    selectedStat: string,
    timeMin: number,
    timeMax: number,
    timeStep: number,
}

export class MainView extends React.Component<IMainViewProps, IMainViewState> {
    private apiClient: APIClient;
    private pointVisibility: Map<string, number[]>;
    private statsData: Map<string, IUnitStatsData[]>;
    private timeseriesData: Map<string, ITimeseriesData[]>;

    constructor(props: IMainViewProps) {
        super(props);

        let compartmentViewTree = this.props.compartmentTree.getCompartmentNodeViewTree(true);
        compartmentViewTree.isVisible = true;
 
        this.state = {
            aesthetics: [],
            colorBounds: [0, 255],
            compartmentViewTree: compartmentViewTree,
            filterPredicate: null,
            frameRate: 30,
            isPlaying: false,
            loopAnimation: 'once',
            opacityBounds: [0.01, 1],
            radiusBounds: [5, 500],
            selectedColor: 'nothing',
            selectedOpacity: 'nothing',
            selectedRadius: 'nothing',
            selectedStat: 'nothing',
            compartmentSubsetOnly: true,
            timeMin: 0,
            timeMax: 0,
            timeStep: 0.01,
        }

        this.apiClient = new APIClient(this.props.constants.apiEndpoint);
        this.pointVisibility = new Map<string, number[]>();
        this.statsData = new Map<string, IUnitStatsData[]>();
        this.timeseriesData = new Map<string, ITimeseriesData[]>();
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

        if (!this.pointVisibility.has(penetrationId) && penIdx > -1) {
            visibility = new Array(this.props.availablePenetrations[penIdx].ids.length);
            visibility.fill(1);
        } else if (this.pointVisibility.has(penetrationId)) {
            visibility = this.pointVisibility.get(penetrationId);
        }

        return visibility;
    }

    private handleFilterPredicateUpdate(predicate: Predicate, newStat: string) {
        if (newStat !== 'nothing' && !this.statsData.has(newStat)) {
            this.apiClient.fetchUnitStatsById(newStat)
                .then((res: any) => res.data)
                .then((responseData: IUnitStatsListResponse) => {
                    let statsData: IUnitStatsData[] = [];

                    responseData.unitStats.forEach((data) => {
                        statsData.push({
                            penetrationId: data.penetrationId,
                            values: data.data
                        });
                    });

                    this.statsData.set(newStat, statsData);
                    this.updateFilter(predicate);
                })
                .catch((err: Error) => console.error(err));
        } else {
            this.updateFilter(predicate);
        }
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

    private handleStatSelectionChange(event: React.ChangeEvent<{
        name?: string;
        value: string;
    }>) {
        const value = event.target.value;
        this.fetchAndUpdateUnitStats(value);
    }

    private handleSubsetOnlyToggle() {
        const compartmentSubsetOnly = !this.state.compartmentSubsetOnly;
        let compartmentViewTree = this.props.compartmentTree.getCompartmentNodeViewTree(compartmentSubsetOnly);
        compartmentViewTree.isVisible = true;

        this.setState({ compartmentSubsetOnly, compartmentViewTree });
    }

    private handleToggleCompartmentVisible(rootNode: ICompartmentNodeView) {
        this.setState({ compartmentViewTree: rootNode });
    }

    public handleUpdateCompartmentViews(compartmentViewTree: ICompartmentNodeView) {
        this.setState({ compartmentViewTree });
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

        this.setState({ aesthetics, timeMax, timeMin });
    }

    private updateFilter(predicate: Predicate) {
        this.props.availablePenetrations.forEach((penetrationData) => {
            const penetrationId = penetrationData.penetrationId;

            let visibility: number[];
            if (predicate === null) { // clear filter
                visibility = new Array(penetrationData.ids.length);
                visibility.fill(1);
            } else {
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
                    let pointModel = new PointModel({
                        compartment: penetrationData.compartments[i],
                        coordinates: penetrationData.coordinates.slice(i*3, (i+1)*3),
                        id: penetrationData.ids[i],
                        penetrationId: penetrationId,
                    });

                    penStatsData.forEach((statValues, statName) => {
                        pointModel.setStat(statName, statValues.values[i]);
                    });
                    pointModels.push(pointModel);
                }

                visibility = predicate.eval(pointModels).map(v => Number(v));
            }

            this.pointVisibility.set(penetrationId, visibility);
        });

        this.setState({ filterPredicate: predicate }, () => {
            this.updateAesthetics();
        });
    }

    public componentDidUpdate(prevProps: Readonly<IMainViewProps>) {
        if (!_.isEqual(prevProps.availablePenetrations, this.props.availablePenetrations)) {
            // set all points to visible by default
            this.pointVisibility = new Map<string, number[]>();
            this.props.availablePenetrations.forEach((penetrationData) => {
                const penetrationId = penetrationData.penetrationId;
                const nPoints = penetrationData.ids.length;
                const visible = new Array<number>(nPoints);
                visible.fill(1);

                this.pointVisibility.set(penetrationId, visible);
            });

            this.setState({ filterPredicate: null }, () => this.updateAesthetics());
        }
    }

    public render() {
        const viewerContainerProps: IViewerContainerProps = {
            aesthetics: this.state.aesthetics,
            availablePenetrations: this.props.availablePenetrations,
            constants: this.props.constants,
            settings: this.props.settings,
            timeMax: this.state.timeMax,
            timeMin: this.state.timeMin,
            timeStep: this.state.timeStep,
            viewerType: '3D',
            compartmentViewTree: this.state.compartmentViewTree,
        }

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

        const filterControlProps: IFilterControlsProps = {
            availablePenetrations: this.props.availablePenetrations,
            compartmentSubsetOnly: this.state.compartmentSubsetOnly,
            compartmentViewTree: this.state.compartmentViewTree,
            constants: this.props.constants,
            filterPredicate: this.state.filterPredicate,
            selectedStat: this.state.selectedStat,
            settings: this.props.settings,
            statsData: this.state.selectedStat === 'nothing' ?
                [] : _.union(
                    ...(this.statsData.get(this.state.selectedStat).map(entry => entry.values))
                ),
            onFilterPredicateUpdate: this.handleFilterPredicateUpdate.bind(this),
            onStatSelectionChange: this.handleStatSelectionChange.bind(this),
            onToggleCompartmentVisible: this.handleToggleCompartmentVisible.bind(this),
        }

        const style = { padding: 30 };
        return (
            <div style={style}>
                <Grid container
                      spacing={2}>
                    <Grid item xs={5}>
                        <ViewerContainer {...viewerContainerProps} />
                    </Grid>
                    <Grid item xs={7}>
                        <FilterControls {...filterControlProps} />
                    </Grid>
                    <Grid item xs={7}>
                        <TimeseriesControls {...timeseriesControlsProps}/>
                    </Grid>
                </Grid>
            </div>
        );
    }
}