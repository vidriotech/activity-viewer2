import React from 'react';
import * as _ from "lodash";

import Backdrop from "@material-ui/core/Backdrop";
import Modal from "@material-ui/core/Modal";
import LinearProgress from "@material-ui/core/LinearProgress";
import Grid from '@material-ui/core/Grid';

// eslint-disable-next-line import/no-unresolved
import {APIClient, AestheticRequest, TimeseriesResponse} from '../apiClient';
// eslint-disable-next-line import/no-unresolved
import { AVConstants } from '../constants';

import {
    ExportingUnit,
    AVSettings,
    PenetrationData,
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
import {
    AestheticMapping,
    AestheticParams,
    AestheticProps,
    AestheticSelection,
    AestheticType,
    TransformParams
// eslint-disable-next-line import/no-unresolved
} from '../models/aestheticMapping';
// eslint-disable-next-line import/no-unresolved
import { CompartmentNodeView } from '../viewmodels/compartmentViewModel';

// eslint-disable-next-line import/no-unresolved
import { CompartmentList, CompartmentListProps } from './CompartmentList/CompartmentList';
// eslint-disable-next-line import/no-unresolved
import { FilterControls, FilterControlsProps } from './FilterControls/FilterControls';
// eslint-disable-next-line import/no-unresolved
import { TimeseriesMappers, TimeseriesMappersProps } from './TimeseriesControls/TimeseriesMappers';
// eslint-disable-next-line import/no-unresolved
import { ViewerContainer, ViewerContainerProps } from './Viewers/ViewerContainer';
// eslint-disable-next-line import/no-unresolved
import { UnitTable, UnitTableProps } from './UnitTable/UnitTable';
// eslint-disable-next-line import/no-unresolved
import {ColorLUT} from "../models/colorMap";
// eslint-disable-next-line import/no-unresolved
import {TimeseriesEntry, TimeseriesSummary} from "../models/timeseries";
import {AxiosResponse} from "axios";

// eslint-disable-next-line import/no-unresolved
import MapperWorker from "worker-loader!../worker";


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

interface MainViewState extends AestheticProps {
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
    progress: number;
    selectedStat: string;
    timeMin: number;
    timeMax: number;
    timeStep: number;
}

export class MainView extends React.Component<MainViewProps, MainViewState> {
    private apiClient: APIClient;
    private statsData: Map<string, UnitStatsData[]>;
    private timeseriesData: Map<string, TimeseriesData[]>;
    private timeseriesEntries: Map<string, TimeseriesEntry[]>;
    private timeseriesSummaries: Map<string, TimeseriesSummary>;
    private workers: MapperWorker[];

    constructor(props: MainViewProps) {
        super(props);

        const compartmentViewTree = this.props.compartmentTree.getCompartmentNodeViewTree(true);
        compartmentViewTree.isVisible = true;
 
        this.state = {
            aestheticMappings: [],
            availablePenetrations: [],
            busy: false,
            colorBounds: [0, 255],
            colorLUT: this.props.constants.defaultColorLUT,
            compartmentViewTree: compartmentViewTree,
            filterPredicate: null,
            frameRate: 30,
            isPlaying: false,
            loopAnimation: 'once',
            progress: 100,
            opacityBounds: [0.01, 1],
            radiusBounds: [5, 500],
            selectedColor: "nothing",
            selectedColorMapping: "bwr",
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
        this.timeseriesEntries = new Map<string, TimeseriesEntry[]>();
        this.timeseriesSummaries = new Map<string, TimeseriesSummary>();

        this.workers = [];
        for (let i = 0; i < 4; i++) {
            const worker = new MapperWorker();
            worker.onmessage = this.onMapperMessage.bind(this);
            this.workers.push(worker);
        }
    }

    private aestheticByTimeseries(timeseriesId: string): AestheticType {
        let aesthetic: AestheticType = null;

        if (this.state.selectedColor === timeseriesId) {
            aesthetic = "color";
        } else if (this.state.selectedOpacity === timeseriesId) {
            aesthetic = "opacity";
        } else if (this.state.selectedRadius === timeseriesId) {
            aesthetic = "radius";
        }

        return aesthetic;
    }

    private fetchAndUpdateAesthetics3(timeseriesIds: string[], page = 1): void {
        this.apiClient.fetchPenetationTimeseries(timeseriesIds, page)
            .then((res) => res.data)
            .then((data) => {
                data.timeseries.forEach((ts, idx) => {
                    const summary = ts.summary;
                    const timeseriesId = summary.timeseriesId;

                    if (!this.timeseriesSummaries.has(timeseriesId)) {
                        this.timeseriesSummaries.set(timeseriesId, summary);
                    }

                    if (!this.timeseriesEntries.has(timeseriesId)) {
                        this.timeseriesEntries.set(timeseriesId, []);
                    }

                    const aesthetic = this.aestheticByTimeseries(timeseriesId);
                    if (aesthetic === null) {
                        return;
                    }

                    const key = `${aesthetic}Bounds` as "colorBounds" | "opacityBounds" | "radiusBounds";
                    const transformBounds = this.state[key];

                    const entries = this.timeseriesEntries.get(timeseriesId).slice();
                    const tsPenetrations = entries.map((entry) => (
                        entry.penetrationId
                    ));

                    ts.penetrations.forEach((entry, jdx) => {
                        if (!tsPenetrations.includes(entry.penetrationId)) {
                            entries.push(entry);
                            const msg: TransformParams = {
                                entry,
                                aesthetic,
                                dataBounds: [summary.timeMin, summary.timeMax],
                                transformBounds
                            }
                            this.workers[((idx * ts.penetrations.length) + jdx) % 4].postMessage(msg)
                        }
                    });

                    this.timeseriesEntries.set(timeseriesId, entries);
                });
                if (data.link) {
                    this.fetchAndUpdateAesthetics3(timeseriesIds, page + 1);
                } else {
                    this.setState({busy: false});
                }
            });
    }

    private fetchAndUpdateAesthetics2(aesthetic: AestheticType, timeseriesId: string): void {
        if (timeseriesId === "nothing") {
            const aestheticMappings = this.state.aestheticMappings.slice();
            aestheticMappings.forEach((mapping) => {
                mapping[aesthetic] = null;
            });

            this.setState({aestheticMappings});
            return;
        }

        this.apiClient.fetchTimeseriesSummary(timeseriesId)
            .then((res) => res.data)
            .then((summary) => {
                this.setState({
                    timeMin: isNaN(this.state.timeMin) ? summary.timeMin : Math.min(summary.timeMin, this.state.timeMin),
                    timeMax: isNaN(this.state.timeMax) ? summary.timeMax : Math.max(summary.timeMax, this.state.timeMax),
                    timeStep: isNaN(this.state.timeStep) ? summary.timeStep : Math.min(summary.timeStep, this.state.timeStep),
                    progress: 0,
                    // busy: true,
                }, () => {
                    const bounds = [summary.minVal, summary.maxVal];

                    this.state.availablePenetrations.forEach((penetrationData, idx) => {
                        const penetrationId = penetrationData.penetrationId;

                        this.apiClient.fetchTimeseries(penetrationId, timeseriesId)
                            .then((res) => res.data)
                            .then((entry) => {
                                this.workers[idx % 4].postMessage({
                                    entry,
                                    aesthetic,
                                    bounds
                                });
                            })
                            .catch((err) => {
                                console.error(err);
                                // 404: update progress
                                this.setState({
                                    progress: this.state.progress + 100/this.state.aestheticMappings.length
                                });
                            });
                    });
                });
            })
            .catch((err) => console.error(err));
    }

    private fetchAndUpdateAesthetics(
        aesthetic: AestheticType,
        timeseriesId: string,
        idx = 0,
    ): void {
        if (idx >= this.state.availablePenetrations.length) {
            this.setState({busy: false});
            return;
        }

        const stride = 10;

        const penetrationIds = this.state.availablePenetrations.map(
            (data) => data.penetrationId
        ).slice(idx, idx + stride);

        const aestheticMappings = this.state.aestheticMappings.slice();

        if (timeseriesId === "nothing") {
            const stop = Math.min(idx + stride, aestheticMappings.length);
            for (let i = idx; i < stop; i++) {
                aestheticMappings[i][aesthetic] = null;
            }

            this.setState({aestheticMappings}, () => {
                this.fetchAndUpdateAesthetics(aesthetic, timeseriesId, idx + stride);
            });
        } else {
            const bounds = this.state[`${aesthetic}Bounds` as keyof(MainViewState)] as [number, number];
            const params: AestheticParams = {};

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

            this.apiClient.fetchAestheticMappings({penetrationIds, params})
                .then((res) => res.data)
                .then((mappings) => mappings.mappings)
                .then((newMappings) => {
                    newMappings.forEach((newMapping, jdx) => {
                        const mapping = aestheticMappings[idx + jdx];

                        if (aesthetic === "color") {
                            if (newMapping.color.colorLUT === null) {
                                newMapping.color.colorLUT = this.props.constants.defaultColorLUT;
                            }

                            mapping[aesthetic] = newMapping[aesthetic];
                        } else {
                            mapping[aesthetic] = newMapping[aesthetic];
                        }

                        aestheticMappings[idx + jdx] = mapping;
                    });

                    this.setState({aestheticMappings}, () => {
                        this.fetchAndUpdateAesthetics(aesthetic, timeseriesId, idx + stride);
                    });
                })
                .catch((err) => console.error(err));
        }
    }

    private fetchAndUpdatePenetrations(page: number): void {
        this.apiClient.fetchPenetrations(10, page)
            .then((res) => res.data)
            .then((data) => {
                const availablePenetrations = this.state.availablePenetrations.slice();
                const newPenetrations: PenetrationData[] = new Array(data.penetrations.length);

                const aestheticMappings = this.state.aestheticMappings.slice();
                const newMappings: AestheticMapping[] = new Array(data.penetrations.length);

                data.penetrations.forEach((penetrationData, idx) => {
                    newPenetrations[idx] = _.extend(
                        penetrationData,
                        {"visible": penetrationData.ids.map(() => true)}
                    );

                    newMappings[idx] = {
                        penetrationId: penetrationData.penetrationId,
                        color: null,
                        opacity: null,
                        radius: null,
                        visibility: penetrationData.ids.map(() => 1)
                    };
                });

                this.setState({
                    availablePenetrations: _.concat(availablePenetrations, newPenetrations),
                    aestheticMappings: _.concat(aestheticMappings, newMappings),
                    busy: !!(data.link),
                    progress: 100 * (availablePenetrations.length + newPenetrations.length) / data.info.totalCount,
                }, () => {
                    if (data.link) {
                        this.fetchAndUpdatePenetrations(page + 1);
                    }
                });
            })
            .catch((err: Error) => {
                console.error(err);
                window.alert(err.message);
            });
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

    private handleAestheticCommit(props: AestheticProps): void {
        let progress = 0;
        if (props.selectedColor === "nothing") {
            progress += 100/3;
        }
        if (props.selectedOpacity === "nothing") {
            progress += 100/3;
        }
        if (props.selectedRadius === "nothing") {
            progress += 100/3;
        }

        let timeMin = Infinity;
        let timeMax = -Infinity;
        let timeStep = Infinity;

        const timeseriesIds = [
            props.selectedColor,
            props.selectedOpacity,
            props.selectedRadius
        ];

        timeseriesIds.forEach((tid) => {
            if (this.timeseriesSummaries.has(tid)) {
                const summary = this.timeseriesSummaries.get(tid);
                timeMin = Math.min(summary.timeMin);
                timeMax = Math.max(summary.timeMax);
                timeStep = Math.min(summary.timeStep);
            }
        });

        if (timeMin === Infinity) {
            timeMin = 0;
        }
        if (timeMax === -Infinity) {
            timeMax = timeMin;
        }
        if (timeStep === Infinity) {
            timeStep = (timeMax - timeMin)/100;
        }

        this.setState(_.extend(
            props,
            {busy: true, progress, timeMin, timeMax, timeStep}
        ), () => {
            const toFetch: string[] = [];

            timeseriesIds.forEach((tid) => {
                if (tid === "nothing") {
                    return;
                }

                if (this.timeseriesEntries.has(tid)) {
                    const entries = this.timeseriesEntries.get(tid);
                    if (entries.length === this.state.availablePenetrations.length) {
                        this.updateAesthetics(tid);
                        return;
                    }
                }

                toFetch.push(tid);
            });

            this.fetchAndUpdateAesthetics3(toFetch);
        });
    }
    
    private handleAestheticSelectionChange(aesthetic: AestheticType, timeseriesId: string): void {
        const newState = {
            selectedColor: this.state.selectedColor,
            selectedOpacity: this.state.selectedOpacity,
            selectedRadius: this.state.selectedRadius,
        };

        const aesKey = `selected${_.startCase(aesthetic)}` as AestheticSelection;
        newState[aesKey] = timeseriesId;

        _.toPairs(newState).forEach((pair) => {
            const [pairKey, pairVal] = pair;
            if (pairKey !== aesKey && pairVal === timeseriesId) {
                newState[pairKey as AestheticSelection] = "nothing";
            }
        });

        if (timeseriesId !== "nothing" && !this.timeseriesSummaries.has(timeseriesId)) {
            this.apiClient.fetchTimeseriesSummary(timeseriesId)
                .then((res) => res.data)
                .then((summary) => {
                    this.timeseriesSummaries.set(timeseriesId, summary);
                    const timeMin = Math.min(summary.timeMin, this.state.timeMin);
                    const timeMax = Math.max(summary.timeMax, this.state.timeMax);
                    const timeStep = Math.min(summary.timeStep, this.state.timeStep);

                    this.setState(_.extend(
                        newState,
                        // {busy: true, timeMin, timeMax, timeStep}
                        {timeMin, timeMax, timeStep}
                    ), () => {
                        this.fetchAndUpdateAesthetics2(aesthetic, timeseriesId);
                    });
                })
                .catch((err) => console.error(err));
        } else {
            this.setState(_.extend(
                newState,
                // {busy: true}
                {}
            ), () => {
                this.fetchAndUpdateAesthetics2(aesthetic, timeseriesId);
            });
        }
    }
    
    private handleAestheticSliderChange(
        aesthetic: AestheticType,
        newBounds: [number, number],
        commit: boolean
    ): void {
        const newState = {
            // busy: commit ? true : this.state.busy,
            colorBounds: aesthetic === "color" ? newBounds : this.state.colorBounds,
            opacityBounds: aesthetic === "opacity" ? newBounds : this.state.opacityBounds,
            radiusBounds: aesthetic === "radius" ? newBounds : this.state.radiusBounds,
        };

        const aesKey = `selected${_.startCase(aesthetic)}` as AestheticSelection;

        this.setState(newState, () => {
            if (commit) {
                this.fetchAndUpdateAesthetics2(
                    aesthetic,
                    this.state[aesKey]
                );
            }
        });
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

    private handleMapperSelectionChange(event: React.ChangeEvent<{ name?: string; value: string }>): void {
        const value = event.target.value;
        if (value !== "nothing") {
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
                console.log(data);
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

    private onMapperMessage(event: MessageEvent): void {
        const data: {penetrationId: string; entry: TimeseriesEntry; aesthetic: AestheticType} = event.data;
        const aesthetic = data.aesthetic;
        const entry = data.entry;
        const penetrationId = entry.penetrationId;

        const aestheticMappings = this.state.aestheticMappings.slice();
        const idx = this.state.availablePenetrations.map(
            (data) => data.penetrationId
        ).indexOf(penetrationId);

        const aestheticMapping = aestheticMappings[idx];
        if (aestheticMapping[aesthetic] === null) {
        if (aesthetic === "color") {
            aestheticMapping[aesthetic] = {
                colorLUT: this.props.constants.defaultColorLUT,
                timeseriesId: entry.timeseriesId,
                times: entry.times,
                values: entry.values,
            };
        } else {
            aestheticMapping[aesthetic] = {
                timeseriesId: entry.timeseriesId,
                times: entry.times,
                values: entry.values,
            };
        }
        } else {
            aestheticMapping[aesthetic].times = entry.times;
            aestheticMapping[aesthetic].values = entry.values;
        }

        let progress = this.state.progress + 100/this.state.aestheticMappings.length;
        let busy = this.state.busy;
        if ((progress > 100 || Math.abs(progress - 100)) < 1e-9) {
            progress = 100;
            busy = false;
        }

        this.setState({aestheticMappings, busy, progress});
    }

    private updateAesthetics(timeseriesId: string): void {
        const aesthetic = this.aestheticByTimeseries(timeseriesId);

        if (aesthetic === null) {
            return;
        }
        const key = `${aesthetic}Bounds` as "colorBounds" | "opacityBounds" | "radiusBounds";
        const transformBounds = this.state[key];

        if (this.timeseriesEntries.has(timeseriesId)) {
            const entries = this.timeseriesEntries.get(timeseriesId);
            const summary = this.timeseriesSummaries.get(timeseriesId);

            if (entries.length === this.state.availablePenetrations.length) {
                entries.forEach((entry, idx) => {
                    const msg: TransformParams = {
                        entry,
                        aesthetic,
                        dataBounds: [summary.timeMin, summary.timeMax],
                        transformBounds,
                    };

                    this.workers[idx % 4].postMessage(msg);
                })
            }
        }
    }

    // private updateAesthetics() {
    //     let timeMin = 0;
    //     let timeMax = 0;
    //
    //     let visiblePenetrations = this.state.availablePenetrations.map(
    //         value => value.penetrationId
    //     );
    //
    //     if (this.state.selectedColor !== 'nothing') {
    //         visiblePenetrations = _.intersection(
    //             visiblePenetrations,
    //             this.timeseriesData.get(this.state.selectedColor).map(
    //                 seriesData => seriesData.penetrationId
    //             )
    //         );
    //     }
    //
    //     if (this.state.selectedOpacity !== 'nothing') {
    //         visiblePenetrations = _.intersection(
    //             visiblePenetrations,
    //             this.timeseriesData.get(this.state.selectedOpacity).map(
    //                 seriesData => seriesData.penetrationId
    //             )
    //         );
    //     }
    //
    //     if (this.state.selectedRadius !== 'nothing') {
    //         visiblePenetrations = _.intersection(
    //             visiblePenetrations,
    //             this.timeseriesData.get(this.state.selectedRadius).map(
    //                 seriesData => seriesData.penetrationId
    //             )
    //         );
    //     }
    //
    //     const aesthetics: AestheticMapping[] = [];
    //
    //     const colorData = this.state.selectedColor === 'nothing' ? null : this.timeseriesData.get(this.state.selectedColor);
    //     const opacityData = this.state.selectedOpacity === 'nothing' ? null : this.timeseriesData.get(this.state.selectedOpacity);
    //     const radiusData = this.state.selectedRadius === 'nothing' ? null : this.timeseriesData.get(this.state.selectedRadius);
    //
    //     this.state.availablePenetrations.forEach((penetrationData) => {
    //         const penetrationId = penetrationData.penetrationId;
    //         if (!visiblePenetrations.includes(penetrationId)) {
    //             return;
    //         }
    //
    //         const penColor = colorData === null ? null : colorData.filter((data) => data.penetrationId === penetrationId)[0];
    //         if (penColor !== null) {
    //             const colorTimes = penColor.times;
    //             timeMin = Math.min(timeMin, colorTimes[0]);
    //             timeMax = Math.max(timeMax, colorTimes[colorTimes.length - 1]);
    //         }
    //
    //         const penOpacity = opacityData === null ? null : opacityData.filter((data) => data.penetrationId === penetrationId)[0];
    //         if (penOpacity !== null) {
    //             const opacityTimes = penOpacity.times;
    //             timeMin = Math.min(timeMin, opacityTimes[0]);
    //             timeMax = Math.max(timeMax, opacityTimes[opacityTimes.length - 1]);
    //         }
    //
    //         const penRadius = radiusData === null ? null : radiusData.filter((data) => data.penetrationId === penetrationId)[0];
    //         if (penRadius !== null) {
    //             const radiusTimes = penRadius.times;
    //             timeMin = Math.min(timeMin, radiusTimes[0]);
    //             timeMax = Math.max(timeMax, radiusTimes[radiusTimes.length - 1]);
    //         }
    //
    //         const aesthetic: AestheticMapping = {
    //             penetrationId: penetrationId,
    //             color: penColor === null ? null : {
    //                 timeseriesId: this.state.selectedColor,
    //                 times: penColor.times,
    //                 values: this.transformValues(penColor.values, [0, 255]),
    //                 colorLUT: this.state.colorLUT,
    //             },
    //             opacity: penOpacity === null ? null : {
    //                 timeseriesId: this.state.selectedOpacity,
    //                 times: penOpacity.times,
    //                 values: this.transformValues(penOpacity.values, this.state.opacityBounds)
    //             },
    //             radius: penRadius === null ? null : {
    //                 timeseriesId: this.state.selectedRadius,
    //                 times: penRadius.times,
    //                 values: this.transformValues(penRadius.values, this.state.radiusBounds)
    //             },
    //             visibility: penetrationData.visible.map((p) => Number(p)),
    //         };
    //         aesthetics.push(aesthetic);
    //     });
    //
    //     this.setState({ aestheticMappings: aesthetics, timeMax, timeMin });
    // }

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
        this.fetchAndUpdatePenetrations(1);
    }

    public render(): React.ReactNode {
        const viewerContainerProps: ViewerContainerProps = {
            aesthetics: this.state.aestheticMappings,
            availablePenetrations: this.state.availablePenetrations,
            busy: this.state.busy,
            constants: this.props.constants,
            settings: this.props.settings,
            timeMax: this.state.timeMax,
            timeMin: this.state.timeMin,
            timeStep: this.state.timeStep,
            compartmentViewTree: this.state.compartmentViewTree,
            onFilterPredicateUpdate: this.handleFilterPredicateUpdate.bind(this),
        }

        const timeseriesControlsProps: TimeseriesMappersProps = {
            busy: this.state.busy,
            colorBounds: this.state.colorBounds,
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
            onCommit: this.handleAestheticCommit.bind(this),
            onAestheticSelectionChange: this.handleAestheticSelectionChange.bind(this),
            onAestheticSliderChange: this.handleAestheticSliderChange.bind(this),
            onColorMapperSelectionChange: this.handleMapperSelectionChange.bind(this),
        };

        const filterControlProps: FilterControlsProps = {
            availablePenetrations: this.state.availablePenetrations,
            busy: this.state.busy,
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

        const compartmentListProps: CompartmentListProps = {
            busy: this.state.busy,
            compartmentSubsetOnly: this.state.compartmentSubsetOnly,
            compartmentViewTree: this.state.compartmentViewTree,
            constants: this.props.constants,
            settings: this.props.settings,
            onToggleCompartmentVisible: this.handleToggleCompartmentVisible.bind(this),
        }

        const unitTableProps: UnitTableProps = {
            availablePenetrations: this.state.availablePenetrations,
            busy: this.state.busy,
            onUnitExportRequest: this.handleUnitExportRequest.bind(this),
        }

        const style = { padding: 30 };
        return (
            <div style={style}>
                {/*<Modal open={this.state.busy}*/}
                {/*       disableBackdropClick*/}
                {/*       disableEscapeKeyDown>*/}
                {/*    <LinearProgress value={this.state.progress}*/}
                {/*                    variant={"determinate"} />*/}
                {/*</Modal>*/}
                <Grid container
                      spacing={2}>
                    <Grid item xs={12}>
                        <FilterControls {...filterControlProps} />
                    </Grid>
                    <Grid item xs={3}>
                        {/* <UnitList {...unitListProps}/> */}
                        <UnitTable {...unitTableProps} />
                    </Grid>
                    <Grid item xs={6}>
                        {this.state.progress < 100 ?
                            <LinearProgress variant="determinate"
                                            value={this.state.progress} /> :
                            null
                        }

                        <ViewerContainer {...viewerContainerProps} />
                    </Grid>
                    <Grid item xs={3}>
                        <CompartmentList {...compartmentListProps} />
                    </Grid>
                    <Grid item xs>
                        <TimeseriesMappers {...timeseriesControlsProps}/>
                    </Grid>
                </Grid>
            </div>
        );
    }
}