import React from 'react';
import * as _ from "lodash";

import Grid from '@material-ui/core/Grid';

// eslint-disable-next-line import/no-unresolved
import { APIClient } from '../apiClient';
// eslint-disable-next-line import/no-unresolved
import { AVConstants } from '../constants';

import {
    ExportingUnit,
    UnitExportRequest,
    AVSettings,
    PenetrationData,
    PenetrationResponse,
    UnitStatsListResponse,
// eslint-disable-next-line import/no-unresolved
} from '../models/apiModels';
// eslint-disable-next-line import/no-unresolved
import { CompartmentTree } from '../compartmentTree';
// eslint-disable-next-line import/no-unresolved
import { PointModel } from '../models/pointModel';
// eslint-disable-next-line import/no-unresolved
import { Predicate } from '../models/predicateModels';

// eslint-disable-next-line import/no-unresolved
import {AestheticMapping, AestheticParams} from '../models/aestheticMapping';
// eslint-disable-next-line import/no-unresolved
import { CompartmentNodeView } from '../viewmodels/compartmentViewModel';

// eslint-disable-next-line import/no-unresolved
import { CompartmentList, ICompartmentListProps } from './CompartmentList/CompartmentList';
// eslint-disable-next-line import/no-unresolved
import { FilterControls, IFilterControlsProps } from './FilterControls/FilterControls';
// eslint-disable-next-line import/no-unresolved
import { TimeseriesControls, TimeseriesControlsProps } from './TimeseriesControls/TimeseriesControls';
// eslint-disable-next-line import/no-unresolved
import { ViewerContainer, ViewerContainerProps } from './Viewers/ViewerContainer';
// eslint-disable-next-line import/no-unresolved
import { UnitTable, UnitTableProps } from './UnitTable/UnitTable';
// eslint-disable-next-line import/no-unresolved
import {ColorLUT} from "../models/colorMap";
// eslint-disable-next-line import/no-unresolved
import {TimeseriesEntries, TimeseriesSummary} from "../models/timeseries";
import {AxiosResponse} from "axios";


interface TimeseriesData {
    penetrationId: string;
    times: number[];
    values: number[];
}

interface UnitStatsData {
    penetrationId: string;
    values: number[];
}

export interface MainViewProps {
    compartmentTree: CompartmentTree;
    constants: AVConstants;
    settings: AVSettings;
}

interface MainViewState {
    aestheticMappings: AestheticMapping[];
    availablePenetrations: PenetrationData[];
    busy: boolean;
    colorLUT: ColorLUT;
    compartmentSubsetOnly: boolean;
    compartmentViewTree: CompartmentNodeView;
    filterPredicate: Predicate;
    frameRate: number;
    isPlaying: boolean;
    loopAnimation: 'once' | 'repeat';
    colorBounds: [number, number];
    opacityBounds: [number, number];
    radiusBounds: [number, number];
    selectedColor: string;
    selectedOpacity: string;
    selectedRadius: string;
    selectedStat: string;
    timeMin: number;
    timeMax: number;
    timeStep: number;
}

type AesKey = "selectedColor" | "selectedOpacity" | "selectedRadius";

export class MainView extends React.Component<MainViewProps, MainViewState> {
    private apiClient: APIClient;
    private statsData: Map<string, UnitStatsData[]>;
    private timeseriesData: Map<string, TimeseriesData[]>;
    private timeseriesEntries: Map<string, TimeseriesEntries>;
    private timeseriesSummaries: Map<string, TimeseriesSummary>;

    constructor(props: MainViewProps) {
        super(props);

        const compartmentViewTree = this.props.compartmentTree.getCompartmentNodeViewTree(true);
        compartmentViewTree.isVisible = true;
 
        this.state = {
            aestheticMappings: [],
            availablePenetrations: [],
            busy: false,
            colorLUT: this.props.constants.defaultColorLUT,
            compartmentViewTree: compartmentViewTree,
            filterPredicate: null,
            frameRate: 30,
            isPlaying: false,
            loopAnimation: 'once',
            colorBounds: [0, 255],
            opacityBounds: [0.01, 1],
            radiusBounds: [5, 500],
            selectedColor: "nothing",
            selectedOpacity: "nothing",
            selectedRadius: "nothing",
            selectedStat: "nothing",
            compartmentSubsetOnly: true,
            timeMin: 0,
            timeMax: 0,
            timeStep: 0.01,
        }

        this.apiClient = new APIClient(this.props.constants.apiEndpoint);
        this.statsData = new Map<string, UnitStatsData[]>();
        this.timeseriesData = new Map<string, TimeseriesData[]>();
        this.timeseriesEntries = new Map<string, TimeseriesEntries>();
        this.timeseriesSummaries = new Map<string, TimeseriesSummary>();
    }

    private fetchAndUpdateAesthetics(
        aesthetic: "color" | "opacity" | "radius",
        timeseriesId: string,
        aestheticMappings: AestheticMapping[]
    ): void {
        const idx = aestheticMappings.length;

        if (idx === this.state.availablePenetrations.length) {
            this.setState({aestheticMappings: aestheticMappings, busy: false});
            return;
        }

        const penetrationData = this.state.availablePenetrations[idx];
        const penetrationId = penetrationData.penetrationId;

        const mapping: AestheticMapping = idx < this.state.aestheticMappings.length ?
            this.state.aestheticMappings[idx] :
            {
                penetrationId,
                color: null,
                opacity: null,
                radius: null,
                visibility: penetrationData.ids.map(() => 1),
            };

        const params: AestheticParams = {};

        if (timeseriesId === "nothing") {
            mapping[aesthetic] = null;

            aestheticMappings.push(mapping);
            this.fetchAndUpdateAesthetics(aesthetic, timeseriesId, aestheticMappings);
        } else {
            const bounds = this.state[`${aesthetic}Bounds` as keyof(MainViewState)] as [number, number];
            if (aesthetic === "color") {
                params.color = {
                    timeseriesId,
                    mapping: this.state.colorLUT.name,
                    bounds: bounds,
                };
            } else {
                params[aesthetic] = {
                    timeseriesId,
                    bounds
                };
            }

            this.apiClient.fetchAestheticMapping(penetrationId, params)
                .then((res) => res.data)
                .then((newMapping) => {
                    console.log(newMapping);

                    if (aesthetic === "color" && newMapping.color.colorLUT === null) {
                        newMapping.color.colorLUT = this.props.constants.defaultColorLUT;
                    }

                    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
                    // @ts-ignore
                    mapping[aesthetic] = newMapping[aesthetic];

                    aestheticMappings.push(mapping);
                    this.fetchAndUpdateAesthetics(aesthetic, timeseriesId, aestheticMappings);
                });
        }
    }

    private fetchAndUpdateUnitStats(value: string): void {
        if (value !== 'nothing' && !this.statsData.has(value)) {
            this.apiClient.fetchUnitStatsById(value)
                .then((res: any) => res.data)
                .then((responseData: UnitStatsListResponse) => {
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
        aesthetic: "color" | "opacity" | "radius",
        timeseriesId: string
    ): void {
        const newState = {
            selectedColor: this.state.selectedColor,
            selectedOpacity: this.state.selectedOpacity,
            selectedRadius: this.state.selectedRadius,
        };

        const aesKey = `selected${_.startCase(aesthetic)}` as AesKey;
        newState[aesKey] = timeseriesId;

        _.toPairs(newState).forEach((pair) => {
            const [pairKey, pairVal] = pair;
            if (pairKey !== aesKey && pairVal === timeseriesId) {
                newState[pairKey as AesKey] = "nothing";
            }
        });

        if (timeseriesId !== "nothing" && !this.timeseriesSummaries.has(timeseriesId)) {
            this.apiClient.fetchTimeseriesSummary(timeseriesId)
                .then((res) => res.data)
                .then((summary) => {
                    this.timeseriesSummaries.set(timeseriesId, summary);
                    const timeMin = Math.min(summary.minTime, this.state.timeMin);
                    const timeMax = Math.max(summary.maxTime, this.state.timeMax);
                    const timeStep = Math.min(summary.minStep, this.state.timeStep);

                    this.setState(_.extend(
                        newState,
                        {busy: true, timeMin, timeMax, timeStep}
                    ), () => {
                        this.fetchAndUpdateAesthetics(aesthetic, timeseriesId, []);
                    });
                })
                .catch((err) => console.error(err));
        } else if (timeseriesId !== "nothing") {
            this.setState(_.extend(
                newState,
                {busy: true}
            ), () => {
                this.fetchAndUpdateAesthetics(aesthetic, timeseriesId, []);
            });
        }
    }
    
    private handleAestheticSliderChange(
        aesthetic: "color" | "opacity" | "radius",
        newBounds: [number, number],
        commit: boolean
    ): void {
        const newState = {
            busy: commit ? true : this.state.busy,
            colorBounds: aesthetic === "color" ? newBounds : this.state.colorBounds,
            opacityBounds: aesthetic === "opacity" ? newBounds : this.state.opacityBounds,
            radiusBounds: aesthetic === "radius" ? newBounds : this.state.radiusBounds,
        };

        const aesKey = `selected${_.startCase(aesthetic)}` as AesKey;

        this.setState(newState, () => {
            if (commit) {
                this.fetchAndUpdateAesthetics(
                    aesthetic,
                    this.state[aesKey],
                    []
                );
            }
        });
    }

    private handleColorSelectionChange(event: React.ChangeEvent<{ name?: string; value: any }>): void {
        this.handleAestheticSelectionChange("color", event.target.value as string);
    }

    private handleFilterPredicateUpdate(predicate: Predicate, newStat = "nothing"): void {
        if (newStat !== 'nothing' && !this.statsData.has(newStat)) {
            this.apiClient.fetchUnitStatsById(newStat)
                .then((res: AxiosResponse<UnitStatsListResponse>) => res.data)
                .then((data) => {
                    const statsData: UnitStatsData[] = [];

                    data.unitStats.forEach((data) => {
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
                .then((res) => res.data)
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

    private handleOpacitySelectionChange(event: React.ChangeEvent<{ name?: string; value: any }>): void {
        this.handleAestheticSelectionChange("opacity", event.target.value as string);
    }

    private handleOpacitySliderChange(event: any, newBounds: [number, number], commit: boolean): void {
        this.handleAestheticSliderChange("opacity", newBounds, commit);
    }

    private handleRadiusSelectionChange(event: React.ChangeEvent<{name?: string; value: any}>): void {
        this.handleAestheticSelectionChange("radius", event.target.value as string);
    }

    private handleRadiusSliderChange(event: any, newBounds: [number, number], commit: boolean): void {
        this.handleAestheticSliderChange("radius", newBounds, commit);
    }

    private handleStatSelectionChange(event: React.ChangeEvent<{
        name?: string;
        value: string;
    }>) {
        const value = event.target.value;
        this.fetchAndUpdateUnitStats(value);
    }

    private handleToggleCompartmentVisible(rootNode: CompartmentNodeView) {
        this.setState({ compartmentViewTree: rootNode });
    }

    public handleUpdateCompartmentViews(compartmentViewTree: CompartmentNodeView) {
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
                visibility: penetrationData.visible.map((p) => Number(p)),
            };
            aesthetics.push(aesthetic);
        });

        this.setState({ aestheticMappings: aesthetics, timeMax, timeMin });
    }

    public updateColorMap(): void {
        const aesthetics: AestheticMapping[] = [];
        this.state.aestheticMappings.forEach((aesthetic) => {
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
                visibility: aesthetic.visibility,
            })
        });

        this.setState({ aestheticMappings: aesthetics });
    }

    private updateFilter(predicate: Predicate): void {
        const availablePenetrations: PenetrationData[] = [];
        const aestheticMappings: AestheticMapping[] = [];

        this.state.availablePenetrations.forEach((penetrationData, idx) => {
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

            const newPenetrationData = _.cloneDeep(penetrationData);
            newPenetrationData.visible = visible;
            availablePenetrations.push(newPenetrationData);

            const mapping: AestheticMapping = idx < this.state.aestheticMappings.length ?
                this.state.aestheticMappings[idx] :
                {
                    penetrationId,
                    color: null,
                    opacity: null,
                    radius: null,
                    visibility: []
                };

            mapping.visibility = visible.map(x => Number(x));
            aestheticMappings.push(mapping);
        });

        this.setState({
            aestheticMappings: aestheticMappings,
            availablePenetrations,
            filterPredicate: predicate
        });
    }

    public componentDidMount(): void {
        this.apiClient.fetchPenetrations()
            .then((res) => res.data)
            .then((data) => {
                const availablePenetrations: PenetrationData[] = new Array(data.penetrations.length);
                const aestheticMappings: AestheticMapping[] = new Array(data.penetrations.length);

                data.penetrations.forEach((penetrationData, idx) => {
                    availablePenetrations[idx] = _.extend(
                        penetrationData,
                        {"visible": penetrationData.ids.map(() => true)}
                    );
                    aestheticMappings[idx] = {
                        penetrationId: penetrationData.penetrationId,
                        color: null,
                        opacity: null,
                        radius: null,
                        visibility: penetrationData.ids.map(() => 1)
                    };
                });

                this.setState({availablePenetrations, aestheticMappings});
            })
            .catch((err: Error) => {
                console.error(err);
                window.alert(err.message);
            });
    }

    public render(): React.ReactNode {
        const viewerContainerProps: ViewerContainerProps = {
            aesthetics: this.state.aestheticMappings,
            availablePenetrations: this.state.availablePenetrations,
            constants: this.props.constants,
            settings: this.props.settings,
            timeMax: this.state.timeMax,
            timeMin: this.state.timeMin,
            timeStep: this.state.timeStep,
            compartmentViewTree: this.state.compartmentViewTree,
            onFilterPredicateUpdate: this.handleFilterPredicateUpdate.bind(this),
        }

        const timeseriesControlsProps: TimeseriesControlsProps = {
            opacityBounds: this.state.opacityBounds,
            radiusBounds: this.state.radiusBounds,
            selectedColor: this.state.selectedColor,
            selectedColorMapping: this.state.colorLUT.name,
            selectedOpacity: this.state.selectedOpacity,
            selectedRadius: this.state.selectedRadius,
            timeseriesList: _.sortedUniq(
                _.flatten(this.state.availablePenetrations.map(
                    pen => pen.timeseries
                )).sort()
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