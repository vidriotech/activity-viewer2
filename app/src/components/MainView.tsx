import React from 'react';
import * as _ from "lodash";

import Grid from '@material-ui/core/Grid';

// eslint-disable-next-line import/no-unresolved
import {APIClient} from '../apiClient';
// eslint-disable-next-line import/no-unresolved
import {CompartmentTree} from '../compartmentTree';
// eslint-disable-next-line import/no-unresolved
import {AVConstants} from '../constants';

// eslint-disable-next-line import/no-unresolved
import {AVSettings, ExportingUnit, PenetrationData, UnitStatsListResponse} from "../models/apiModels";
// eslint-disable-next-line import/no-unresolved
import {PointModel} from '../models/pointModel';
// eslint-disable-next-line import/no-unresolved
import {Predicate} from '../models/predicateModels';

// eslint-disable-next-line import/no-unresolved
import {AestheticProps} from "../models/aestheticMapping";
// eslint-disable-next-line import/no-unresolved
import {CompartmentNodeView} from '../viewmodels/compartmentViewModel';

// eslint-disable-next-line import/no-unresolved
import {CompartmentList, CompartmentListProps} from './CompartmentList/CompartmentList';
// eslint-disable-next-line import/no-unresolved
import {FilterControls, FilterControlsProps} from './FilterControls/FilterControls';
// eslint-disable-next-line import/no-unresolved
import {TimeseriesMappers, TimeseriesMappersProps} from './TimeseriesControls/TimeseriesMappers';
// eslint-disable-next-line import/no-unresolved
import {ViewerContainer, ViewerContainerProps} from './Viewers/ViewerContainer';
// eslint-disable-next-line import/no-unresolved
import {UnitTable, UnitTableProps} from './UnitTable/UnitTable';
// eslint-disable-next-line import/no-unresolved
// eslint-disable-next-line import/no-unresolved
import {TimeseriesData, TimeseriesSummary} from "../models/timeseries";

// eslint-disable-next-line import/no-unresolved
import MapperWorker from "worker-loader!../worker";
import Typography from "@material-ui/core/Typography";
import IconButton from "@material-ui/core/IconButton";
import {ChevronLeft, ChevronRight} from "@material-ui/icons";
import Container from "@material-ui/core/Container";
import {DisplayPanel, DisplayPanelProps} from "./Panels/DisplayPanel";
import {HeaderPanel} from "./Panels/HeaderPanel";
import {QueryPanel} from "./Panels/QueryPanel";

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
    availablePenetrations: PenetrationData[];
    compartmentViewTree: CompartmentNodeView;
    filterPredicate: Predicate;
    progress: number;
    progressMessage: string;
    selectedStat: string;

    compartmentListHidden: boolean;
    unitTableHidden: boolean;

    showDisplayLeft: boolean;
    showDisplayRight: boolean;
}

export class MainView extends React.Component<MainViewProps, MainViewState> {
    private apiClient: APIClient;
    private statsData: Map<string, UnitStatsData[]>;
    private timeseriesData: Map<string, TimeseriesData[]>;
    private timeseriesSummaries: Map<string, TimeseriesSummary>;
    // private workers: MapperWorker[];

    constructor(props: MainViewProps) {
        super(props);

        const compartmentViewTree = this.props.compartmentTree.getCompartmentNodeViewTree(true);
        compartmentViewTree.isVisible = true;
 
        this.state = {
            availablePenetrations: [],

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

            selectedStat: "nothing",

            filterPredicate: null,

            compartmentViewTree: compartmentViewTree,

            progress: 1,
            progressMessage: "Ready.",

            compartmentListHidden: false,
            unitTableHidden: false,

            showDisplayLeft: true,
            showDisplayRight: true,
        }

        this.apiClient = new APIClient(this.props.constants.apiEndpoint);
        this.statsData = new Map<string, UnitStatsData[]>();
        this.timeseriesData = new Map<string, TimeseriesData[]>();
        this.timeseriesSummaries = new Map<string, TimeseriesSummary>();

        // this.workers = [];
        // for (let i = 0; i < 4; i++) {
        //     const worker = new MapperWorker();
        //     worker.onmessage = this.onMapperMessage.bind(this);
        //     this.workers.push(worker);
        // }
    }

    private fetchAndUpdatePenetrations(page: number): void {
        this.apiClient.fetchPenetrations(10, page)
            .then((res) => res.data)
            .then((data) => {
                const availablePenetrations = this.state.availablePenetrations.slice();
                const newPenetrations: PenetrationData[] = new Array(data.penetrations.length);

                data.penetrations.forEach((penetrationData, idx) => {
                    newPenetrations[idx] = _.extend(
                        penetrationData,
                        {"selected": penetrationData.ids.map(() => true)}
                    );
                });

                const nPenetrations = availablePenetrations.length + newPenetrations.length;
                const progressMessage = nPenetrations < data.info.totalCount ?
                    `Fetched ${nPenetrations}/${data.info.totalCount} penetrations.` :
                    "Ready.";

                this.setState({
                    availablePenetrations: _.concat(availablePenetrations, newPenetrations),
                    progress: nPenetrations / data.info.totalCount,
                    progressMessage: progressMessage,
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

    private handleAestheticCommit(aestheticProps: AestheticProps): void {
        this.setState(aestheticProps);
    }

    private handleUpdateFilterPredicate(predicate: Predicate, newStat = "nothing"): void {
        if (newStat !== 'nothing' && !this.statsData.has(newStat)) {
            this.apiClient.fetchUnitStatsById(newStat)
                .then((res) => res.data)
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

    private handleStatSelectionChange(event: React.ChangeEvent<{name?: string; value: string}>): void {
        const value = event.target.value;
        this.fetchAndUpdateUnitStats(value);
    }

    public handleRequestUnitExport(): void {
        const unitExport: ExportingUnit[] = [];
        this.state.availablePenetrations.forEach((penetrationData) => {
            unitExport.push({
                penetrationId: penetrationData.penetrationId,
                unitIds: penetrationData.ids.filter((_id, idx) => penetrationData.selected[idx]),
            });
        });

        this.apiClient.fetchExportedData(unitExport)
            .then((data) => data.data)
            .then((data: Blob) => {
                const blob = new Blob([data]);
                const url = URL.createObjectURL(blob);

                const a = document.createElement('a');
                document.body.appendChild(a);
                a.href = url;
                a.download = "export.npz";
                a.click();

                window.URL.revokeObjectURL(url);
            });
    }

    private updateFilter(predicate: Predicate): void {
        const availablePenetrations: PenetrationData[] = [];

        this.state.availablePenetrations.forEach((penetrationData, idx) => {
            const penetrationId = penetrationData.penetrationId;

            let selected: boolean[];
            if (predicate === null) { // clear filter
                selected = new Array(penetrationData.ids.length);
                selected.fill(true);
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

                selected = predicate.eval(pointModels);
            }

            const newPenetrationData = _.cloneDeep(penetrationData);
            newPenetrationData.selected = selected;
            availablePenetrations.push(newPenetrationData);
        });

        this.setState({
            availablePenetrations,
            filterPredicate: predicate
        });
    }

    public get isBusy(): boolean {
        return this.state.progress < 1;
    }

    public componentDidMount(): void {
        this.fetchAndUpdatePenetrations(1);
    }

    public render(): React.ReactNode {
        const timeseriesControlsProps: TimeseriesMappersProps = {
            busy: this.isBusy,
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
            timeseriesList: _.sortedUniq(
                _.flatten(this.state.availablePenetrations.map(
                    pen => pen.timeseries
                )).sort()
            ),
            onCommit: this.handleAestheticCommit.bind(this),
        };

        const filterControlProps: FilterControlsProps = {
            availablePenetrations: this.state.availablePenetrations,
            busy: this.isBusy,
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
            onUpdateFilterPredicate: this.handleUpdateFilterPredicate.bind(this),
            onStatSelectionChange: this.handleStatSelectionChange.bind(this),
        }

        const utWidth = this.state.unitTableHidden ? 0 : 3;
        const clWidth = this.state.compartmentListHidden ? 0 : 3;
        const vcWidth = 12 - utWidth - clWidth as 6 | 9 | 12;

        const displayPanelProps: DisplayPanelProps = {
            availablePenetrations: this.state.availablePenetrations,
            compartmentViewTree: this.state.compartmentViewTree,
            constants: this.props.constants,
            settings: this.props.settings,

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

            busy: this.isBusy,
            progress: this.state.progress,
            progressMessage: this.state.progressMessage,

            onToggleCompartmentVisible: (rootNode: CompartmentNodeView): void => {
                this.setState({ compartmentViewTree: rootNode })
            },
            onRequestUnitExport: this.handleRequestUnitExport.bind(this),
            onUpdateFilterPredicate: this.handleUpdateFilterPredicate.bind(this),
            onUpdateProgress: (progress: number, progressMessage: string): void => {
                this.setState({progress, progressMessage})
            }
        }

        return (
            <Grid container
                  direction="column"
                  style={{padding: 20}}>
                <Grid item>
                    <HeaderPanel busy />
                </Grid>
                <Grid item>
                    <QueryPanel busy />
                </Grid>
                <Grid item>
                    <DisplayPanel {...displayPanelProps} />
                </Grid>
            </Grid>
        );
        // return (
        //     <div style={style}>
        //         <Grid container
        //               spacing={2}>
        //             <Grid item xs={12}>
        //                 <FilterControls {...filterControlProps} />
        //             </Grid>

        //             <Grid item xs={vcWidth}>
        //                 <div>
        //                     <Grid container xs={12}>
        //                         <Grid item xs={2}>
        //                             <IconButton edge="start"
        //                                         onClick={(): void => {
        //                                             this.setState({unitTableHidden: !this.state.unitTableHidden})
        //                                         }} >
        //                                 {this.state.unitTableHidden ? <ChevronRight /> : <ChevronLeft />}
        //                             </IconButton>
        //                         </Grid>
        //                         <Grid item xs={8}></Grid>
        //                         <Grid item xs={2}>
        //                             <IconButton edge="end"
        //                                         onClick={(): void => {
        //                                             this.setState({compartmentListHidden: !this.state.compartmentListHidden})
        //                                         }} >
        //                                 {this.state.compartmentListHidden ? <ChevronLeft /> : <ChevronRight />}
        //                             </IconButton>
        //                         </Grid>
        //                     </Grid>
        //                 </div>
        //                 <ViewerContainer {...viewerContainerProps} />
        //             </Grid>
        //             {this.state.compartmentListHidden ?
        //                 null :

        //             }
        //             <Grid item xs>
        //                 <TimeseriesMappers {...timeseriesControlsProps}/>
        //             </Grid>
        //         </Grid>
        //     </div>
        // );
    }
}