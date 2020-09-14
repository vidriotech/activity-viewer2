import React from 'react';
import * as _ from 'underscore';
import {AxiosResponse} from "axios";

import Grid from '@material-ui/core/Grid';

// eslint-disable-next-line import/no-unresolved
import { APIClient } from '../apiClient';
// eslint-disable-next-line import/no-unresolved
import { AVConstants } from '../constants';

import {
    ColorLUT,
    ExportingUnit,
    UnitExportRequest,
    AVSettings,
    PenetrationData,
    PenetrationResponse,
    TimeseriesListResponse,
    UnitStatesListResponse,
} from '../models/apiModels';
import { CompartmentTree } from '../compartmentTree';
import { PointModel } from '../models/pointModel';
import { Predicate } from '../models/predicateModels';

import { AestheticMapping } from '../viewmodels/aestheticMapping';
import { ICompartmentNodeView } from '../viewmodels/compartmentViewModel';

import { CompartmentList, ICompartmentListProps } from './CompartmentList/CompartmentList';
import { FilterControls, IFilterControlsProps } from './FilterControls/FilterControls';
import { TimeseriesControls, TimeseriesControlsProps } from './TimeseriesControls/TimeseriesControls';
import { ViewerContainer, ViewerContainerProps } from './Viewers/ViewerContainer';
import { UnitTable, UnitTableProps } from './UnitTable/UnitTable';


interface TimeseriesData {
    penetrationId: string,
    times: number[],
    values: number[],
}

interface UnitStatsData {
    penetrationId: string,
    values: number[],
}

export interface MainViewProps {
    compartmentTree: CompartmentTree,
    constants: AVConstants,
    settings: AVSettings,
}

interface MainViewState {
    aesthetics: AestheticMapping[],
    availablePenetrations: PenetrationData[],
    colorLUT: ColorLUT;
    compartmentSubsetOnly: boolean,
    compartmentViewTree: ICompartmentNodeView,
    filterPredicate: Predicate,
    frameRate: number,
    isPlaying: boolean,
    loopAnimation: 'once' | 'repeat',
    opacityBounds: number[],
    radiusBounds: number[],
    selectedColor: string;
    selectedOpacity: string;
    selectedRadius: string;
    selectedStat: string;
    timeMin: number,
    timeMax: number,
    timeStep: number,
}

export class MainView extends React.Component<MainViewProps, MainViewState> {
    private apiClient: APIClient;
    private statsData: Map<string, UnitStatsData[]>;
    private timeseriesData: Map<string, TimeseriesData[]>;

    constructor(props: MainViewProps) {
        super(props);

        const compartmentViewTree = this.props.compartmentTree.getCompartmentNodeViewTree(true);
        compartmentViewTree.isVisible = true;
 
        this.state = {
            aesthetics: [],
            availablePenetrations: [],
            colorLUT: this.props.constants.defaultColorLUT,
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
        this.statsData = new Map<string, UnitStatsData[]>();
        this.timeseriesData = new Map<string, TimeseriesData[]>();
    }

    private fetchAndUpdateTimeseries(value: string) {
        if (value !== 'nothing' && !this.timeseriesData.has(value)) {
            this.apiClient.fetchTimeseriesById(value)
                .then((res: any) => res.data)
                .then((responseData: TimeseriesListResponse) => {
                    const seriesData: TimeseriesData[] = [];

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
                .then((responseData: UnitStatesListResponse) => {
                    const statsData: UnitStatsData[] = [];

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
    
    private handleAestheticSelectionChange(
        aesthetic: "selectedColor" | "selectedOpacity" | "selectedRadius",
        value: string
    ): void {

        const newState = {
            selectedColor: this.state.selectedColor,
            selectedOpacity: this.state.selectedOpacity,
            selectedRadius: this.state.selectedRadius,
        };
        
        newState[aesthetic] = value;
        const pairs = _.pairs(newState);
        pairs.forEach((pair) => {
            const [pairKey, pairVal] = pair;
            if (pairKey !== aesthetic && pairVal === value) {
                newState[pairKey] = "nothing";
            }
        });

        this.setState(newState, () => this.fetchAndUpdateTimeseries(value));
    }

    private handleColorSelectionChange(event: React.ChangeEvent<{ name?: string; value: any }>): void {
        this.handleAestheticSelectionChange("selectedColor", event.target.value as string);
    }

    private handleFilterPredicateUpdate(predicate: Predicate, newStat: string): void {
        if (newStat !== 'nothing' && !this.statsData.has(newStat)) {
            this.apiClient.fetchUnitStatsById(newStat)
                .then((res: any) => res.data)
                .then((responseData: UnitStatesListResponse) => {
                    const statsData: UnitStatsData[] = [];

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

    private handleMapperSelectionChange(event: React.ChangeEvent<{ name?: string; value: any }>): void {
        const value = event.target.value as string;
        console.log(value);
        if (value !== "default") {
            this.apiClient.fetchColorMapping(value)
                .then((res: AxiosResponse<ColorLUT>) => res.data)
                .then((data: ColorLUT) => {
                    this.setState({ colorLUT: data }, () => {
                        this.updateColorMap();
                    });
                });
        } else {
            this.setState({ colorLUT: this.props.constants.defaultColorLUT }, () => {
                this.updateColorMap();
            });
        }
    }

    private handleOpacitySelectionChange(event: React.ChangeEvent<{ name?: string; value: any }>) {
        this.handleAestheticSelectionChange("selectedOpacity", event.target.value as string);
    }

    private handleOpacitySliderChange(event: any, newValue: number[], commit: boolean) {
        this.setState({ opacityBounds: newValue }, () => {
            if (commit) {
                this.updateAesthetics();
            }
        });
    }

    private handleRadiusSelectionChange(event: React.ChangeEvent<{name?: string; value: any}>): void {
        this.handleAestheticSelectionChange("selectedRadius", event.target.value as string);
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

    private handleToggleCompartmentVisible(rootNode: ICompartmentNodeView) {
        this.setState({ compartmentViewTree: rootNode });
    }

    public handleUpdateCompartmentViews(compartmentViewTree: ICompartmentNodeView) {
        this.setState({ compartmentViewTree });
    }

    public handleUnitExportRequest() {
        const unitExport: ExportingUnit[] = [];
        this.state.availablePenetrations.forEach((penetrationData) => {
            unitExport.push({
                penetrationId: penetrationData.penetrationId,
                unitIds: penetrationData.ids.filter((_id, idx) => penetrationData.visible[idx]),
            });
        });

        this.apiClient.fetchExportedData(unitExport)
            .then((data) => data.data)
            .then((data: any) => {
                window.alert('Data is saved in export.npz');
                // const blob = new Blob([data]);
                // const url = URL.createObjectURL(blob);

                // let a = document.createElement('a');
                // document.body.appendChild(a);
                // a.href = url;
                // a.download = 'export.npz';
                // a.click();

                // window.URL.revokeObjectURL(url);
            });
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

        let visiblePenetrations = this.state.availablePenetrations.map(
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

        const aesthetics: AestheticMapping[] = [];

        const colorData = this.state.selectedColor === 'nothing' ? null : this.timeseriesData.get(this.state.selectedColor);
        const opacityData = this.state.selectedOpacity === 'nothing' ? null : this.timeseriesData.get(this.state.selectedOpacity);
        const radiusData = this.state.selectedRadius === 'nothing' ? null : this.timeseriesData.get(this.state.selectedRadius);

        this.state.availablePenetrations.forEach((penetrationData) => {
            const penetrationId = penetrationData.penetrationId;
            if (!visiblePenetrations.includes(penetrationId)) {
                return;
            }

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

            const aesthetic: AestheticMapping = {
                penetrationId: penetrationId,
                color: penColor === null ? null : {
                    timeseriesId: this.state.selectedColor,
                    times: penColor.times,
                    values: this.transformValues(penColor.values, [0, 255]),
                    colorLUT: this.state.colorLUT,
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
                visible: penetrationData.visible.map((p) => Number(p)),
            };
            aesthetics.push(aesthetic);
        });

        this.setState({ aesthetics, timeMax, timeMin });
    }

    public updateColorMap(): void {
        const aesthetics: AestheticMapping[] = [];
        this.state.aesthetics.forEach((aesthetic) => {
            aesthetics.push({
                penetrationId: aesthetic.penetrationId,
                opacity: aesthetic.opacity,
                radius: aesthetic.radius,
                color: aesthetic.color === null ? null : {
                    timeseriesId: this.state.selectedColor,
                    times: aesthetic.color.times,
                    values: aesthetic.color.values,
                    colorLUT: this.state.colorLUT,
                },
                visible: aesthetic.visible,
            })
        });

        this.setState({ aesthetics });
    }

    private updateFilter(predicate: Predicate) {
        const availablePenetrations: PenetrationData[] = [];

        this.state.availablePenetrations.forEach((penetrationData) => {
            const penetrationId = penetrationData.penetrationId;

            let visible: boolean[];
            if (predicate === null) { // clear filter
                visible = new Array(penetrationData.ids.length);
                visible.fill(true);
            } else {
                // collect stats data for points in this penetration
                const penStatsData = new Map<string, UnitStatsData>();
                this.statsData.forEach((statValues, statName) => {
                    const idx = statValues.map(v => v.penetrationId).indexOf(penetrationId);
                    if (idx === -1) {
                        return;
                    }

                    penStatsData.set(statName, statValues[idx]);
                });

                // filter points
                const pointModels: PointModel[] = [];
                for (let i = 0; i < penetrationData.ids.length; i++) {
                    const pointModel = new PointModel({
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

                visible = predicate.eval(pointModels);
            }

            availablePenetrations.push(_.extend(
                _.pick(
                    penetrationData,
                    _.without(_.keys(penetrationData), 'visible')
                ),
                { 'visible': visible }
            ));
        });

        this.setState({ availablePenetrations, filterPredicate: predicate }, () => {
            this.updateAesthetics();
        });
    }

    public componentDidMount(): void {
        this.apiClient.fetchPenetrations()
            .then((res: any) => res.data)
            .then((data: PenetrationResponse) => {
                this.setState({
                    availablePenetrations: data.penetrations.map((penetration) => (
                        _.extend(penetration, { 'visible': penetration.ids.map(_x => true)})
                    ))
                });
            })
            .catch((err: Error) => {
                console.error(err);
                window.alert(err.message);
            });
    }

    public render() {
        const viewerContainerProps: ViewerContainerProps = {
            aesthetics: this.state.aesthetics,
            availablePenetrations: this.state.availablePenetrations,
            constants: this.props.constants,
            settings: this.props.settings,
            timeMax: this.state.timeMax,
            timeMin: this.state.timeMin,
            timeStep: this.state.timeStep,
            compartmentViewTree: this.state.compartmentViewTree,
        }

        const timeseriesControlsProps: TimeseriesControlsProps = {
            opacityBounds: this.state.opacityBounds,
            radiusBounds: this.state.radiusBounds,
            selectedColor: this.state.selectedColor,
            selectedColorMapping: this.state.colorLUT.name,
            selectedOpacity: this.state.selectedOpacity,
            selectedRadius: this.state.selectedRadius,
            timeseriesList: _.uniq(
                _.flatten(this.state.availablePenetrations.map(
                    pen => pen.timeseries
                )).sort(), true
            ),
            onColorSelectionChange: this.handleColorSelectionChange.bind(this),
            onMapperSelectionChange: this.handleMapperSelectionChange.bind(this),
            onOpacitySelectionChange: this.handleOpacitySelectionChange.bind(this),
            onOpacitySliderChange: this.handleOpacitySliderChange.bind(this),
            onRadiusSelectionChange: this.handleRadiusSelectionChange.bind(this),
            onRadiusSliderChange: this.handleRadiusSliderChange.bind(this),
        };

        const filterControlProps: IFilterControlsProps = {
            availablePenetrations: this.state.availablePenetrations,
            compartmentSubsetOnly: this.state.compartmentSubsetOnly,
            compartmentTree: this.props.compartmentTree,
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

        const compartmentListProps: ICompartmentListProps = {
            compartmentSubsetOnly: this.state.compartmentSubsetOnly,
            compartmentViewTree: this.state.compartmentViewTree,
            constants: this.props.constants,
            settings: this.props.settings,
            onToggleCompartmentVisible: this.handleToggleCompartmentVisible.bind(this),
        }

        const style = { padding: 30 };
        return (
            <div style={style}>
                <Grid container
                      spacing={2}>
                    <Grid item xs={12}>
                        <FilterControls {...filterControlProps} />
                    </Grid>
                    <Grid item xs={3}>
                        {/* <UnitList {...unitListProps}/> */}
                        <UnitTable availablePenetrations={this.state.availablePenetrations}
                                   onUnitExportRequest={this.handleUnitExportRequest.bind(this)} />
                    </Grid>
                    <Grid item xs={6}>
                        <ViewerContainer {...viewerContainerProps} />
                    </Grid>
                    <Grid item xs={3}>
                        <CompartmentList {...compartmentListProps} />
                    </Grid>
                    <Grid item xs>
                        <TimeseriesControls {...timeseriesControlsProps}/>
                    </Grid>
                </Grid>
            </div>
        );
    }
}